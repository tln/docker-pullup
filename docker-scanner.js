module.exports = function ({state, docker, emitter}) {
    state.scannedTags = [];
    state.containers = {};
    if (process.env.PULLUP_SCAN !== 'no') {
        scanContainers();
        watchForEvents();
    }
    function scanContainers() {
        docker.listContainers((err, containers) => {
            if (err) return console.log('scanContainers', err);
            for (var container of containers) {
                addContainer(container.Id);
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
        var { Action, Type, from, id } = event;
        if (Type !== 'container') return;
        if (Action === 'start') {
            addContainer(id);
        } else if (Action === 'stop') {
            removeContainer(from);
        } else {
            console.log('Unhandled container event', Type);
        }
    }

    function addContainer(id) {
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
