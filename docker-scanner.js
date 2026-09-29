module.exports = function ({state, docker, emitter, app}) {
    state.scannedTags = [];
    state.containers = {};   // tag -> container info
    state.servicesByTag = {};  // tag -> {service ID -> service info}
    state.lookForSwarmServices = true; // until proven to fail

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
        docker.listContainers((err, items) => {
            if (err) return console.log('listContainers error:', err);
            for (let {Id} of items) addContainerFromId(Id);
        });
    }
    function scanServices() {
        if (!state.lookForSwarmServices) return;
        docker.listServices((err, items) => {
            if (err) {
                if (notSwarm(err)) {
                    console.log('Not a swarm instance. Scanning for services disabled.');
                    state.lookForSwarmServices = false;
                } else {
                    console.log('listServices error:', err);
                }
            } else {
                items.map(addService);
            }
        });
    }
    function notSwarm(err) {
        let {message=''} = err.json || {};
        return/^This node is not a swarm manager/.test(message);
    }
    // The events stream never ends on its own, so parse it line by line
    // (followProgress would buffer every event). Reconnect after a delay if
    // it drops (e.g. daemon restart), and rescan to catch missed events.
    function watchForEvents() {
        const RECONNECT_MS = 5000;
        let running = true, connected = false, stream;
        const filters = {type: ['container'], event: ['start', 'stop']};
        function connect() {
            if (!running) return;
            docker.getEvents({filters}, (err, res) => {
                if (err) {
                    console.log('getEvents error:', err);
                    return reconnect();
                }
                if (connected) { scanContainers(); scanServices(); }
                connected = true;
                stream = res;
                let partial = '';
                res.setEncoding('utf8');
                res.on('data', chunk => {
                    const lines = (partial + chunk).split('\n');
                    partial = lines.pop();
                    for (const line of lines) if (line.trim()) handleEventLine(line);
                });
                res.on('error', err => console.log('getEvents stream error:', err));
                res.on('close', reconnect);
            });
        }
        function reconnect() {
            if (running) setTimeout(connect, RECONNECT_MS);
        }
        function handleEventLine(line) {
            try {
                dockerEvent(JSON.parse(line));
            } catch (err) {
                console.log('docker event error:', err, line);
            }
        }
        connect();
        emitter.on('stop', () => { running = false; if (stream) stream.destroy(); });
    }
    function dockerEvent({ Action, Actor }) {
        // NB. as of docker 1.27, 'services' are not reported as separate events
        if (Action === 'start') {
            addContainerFromId(Actor.ID);
            addServiceFromContainerLabels(Actor.Attributes);
        } else if (Action === 'stop') {
            removeContainer(Actor.Attributes.image);
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
            // Several services can run the same tag (e.g. rails + sidekiq),
            // so keep all of them. Drop this service from any tag it used before.
            for (let byId of Object.values(state.servicesByTag)) delete byId[service.ID];
            (state.servicesByTag[repoTag] = state.servicesByTag[repoTag] || {})[service.ID] = service;
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