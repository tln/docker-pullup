module.exports = function ({state, docker, emitter, app}) {
    state.scannedTags = [];
    state.containers = {};   // tag -> container info
    state.servicesByTag = {};  // tag -> service info

    if (process.env.PULLUP_SCAN !== 'no') {
        scanContainers();
        scanServices();
        watchForEvents();
    }

    app.post('/scan', (req, res) => {
        scanContainers();
        scanServices();
    });

    function scanContainers() {
        _scan('listContainers', (item) => addContainerFromId(item.Id));
    }
    function scanServices() {
        _scan('listServices', addService);
    }
    function _scan(what, cb) {
        docker[what]((err, items) => {
            if (err) return console.log('what', err);
            for (var item of items) {
                cb(item);
            }
        });
    }
    function watchForEvents() {
        const DockerEvents = require('docker-events');
        var events = new DockerEvents({ docker });
        events.start();
        events.on('start', (event) => dockerEvent(event));
        events.on('stop', (event) => dockerEvent(event));
        emitter.on('stop', () => events.stop());
    }
    function dockerEvent(event, state) {
        var { Action, Type, from, id, Actor } = event;
        // NB. as of docker 1.27, 'services' are not reported as separate events
        if (Type !== 'container') return;
        if (Action === 'start') {
            debugger;
            addContainerFromId(id);
            addServiceFromContainerLabels(Actor.Attributes);
        } else if (Action === 'stop') {
            removeContainer(from);
        } else {
            console.log('Unhandled container event', Type);
        }
    }

    function addService(service) {
        var { services, scannedTags } = state;
        if (service.Spec.Labels['docker-pullup']) {
            const completeTag = service.Spec.TaskTemplate.ContainerSpec.Image;
            const [ repoTag, repoSha ] = completeTag.split('@');
            if (!repoSha) {
                // This is strange, the service may be just starting
                console.log('No sha info!');
            }
            service.repoSha = repoSha;
            state.servicesByTag[repoTag] = service;
            emitter.emit('serviceFound', service);
        }
    }

    // This function will detect if the labels signify the container is 
    // a service, and then add the service details as appropriate.
    function addServiceFromContainerLabels(labels) {
        let swarmId = labels['com.docker.swarm.service.id'];
        if (swarmId) {
            docker.getService(swarmId).inspect((err, info) => {
                addService(info);
            });
        }
    }

    // We need more detail when adding a container, therefore we 
    // must inspect.
    function addContainerFromId(id) {
        var { containers, scannedTags } = state;
        docker.getContainer(id).inspect({}, (err, info) => {
            if (err) return console.log(err);
            var repoTag = addLatest(info.Config.Image);
            containers[repoTag] = { id: info.Id };
            if (info.Config.Env.filter((envar) => /^PULLUP/.test(envar))) {
                scannedTags.push(repoTag);
            }
        });
    }

    function removeContainer(repoTag) {
        var { containers, scannedTags } = state;
        var repoTag = addLatest(repoTag);
        delete containers[repoTag];
        var ix = scannedTags.indexOf(repoTag);
        if (ix > -1) scannedTags.splice(ix, 1);
    }
}

function addLatest(repoTag) {
    var afterSlash = repoTag.split('/').pop();
    if (afterSlash.indexOf(':') === -1) {
        repoTag += ':latest';
    }
    return repoTag;
}

function stripSha(repoTag) {
    return repoTag.split('@')[0];
}