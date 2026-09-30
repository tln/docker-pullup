const pshell = require('pshell');
pshell.options.echoCommand = true;

module.exports = function ({emitter, state, docker}) {
    var pullUpContainer = require('./pullup-container');

    emitter.on('push', pullupContainerOrService);
    emitter.on('updateErr', ({pinnedTag, err}) => console.error('updateErr:', pinnedTag, err));

    function pullupContainerOrService(event) {
        var {tag} = event;
        var services = Object.values(state.servicesByTag[tag] || {});
        console.log('pullupContainerOrService:', tag, services.map(s => s.Spec.Name));
        if (services.length) {
            for (let service of services) {
                pullUpService(event, service);
            }
        } else {
            pullUpContainers(tag);
        }
    }

    async function pullUpService(event, {ID, Spec: {Name, TaskTemplate}}) {
        console.log('pullUpService!', Name, event);
        const pinnedTag = event.tag + '@' + event.digest;
        const started = Date.now();
        let eventInfo = {what: 'service', service: ID, name: Name, pinnedTag,
                         imageOld: TaskTemplate.ContainerSpec.Image};
        let updating = false;
        try {
            await pullImage(pinnedTag, state.dockerCreds);
            emitter.emit('updating', eventInfo);
            updating = true;
            await pshell(`docker service update --with-registry-auth --image ${pinnedTag} ${Name}`);
            eventInfo.result = await updateResult(ID, 'ok');
        } catch (err) {
            eventInfo.err = err;
            eventInfo.result = updating ? await updateResult(ID, 'failed') : 'failed';
        }
        if (eventInfo.result !== 'ok' && !eventInfo.err) eventInfo.err = new Error('update rolled back');
        eventInfo.durationMs = Date.now() - started;
        emitter.emit(eventInfo.err ? 'updateErr' : 'update', eventInfo);
    }

    // A failed update with failure_action=rollback ends rolled back; report
    // that rather than the CLI's exit status alone.
    async function updateResult(id, fallback) {
        try {
            const {UpdateStatus} = await docker.getService(id).inspect();
            if (/^rollback/.test((UpdateStatus || {}).State)) return 'rolled_back';
        } catch (err) {
            console.error('updateResult:', err.message);
        }
        return fallback;
    }

    function pullImage(tag, authconfig) {
        return new Promise((resolve, reject) => {
            docker.pull(tag, {authconfig}, (err, stream) => {
                if (err) reject(err);
                else docker.modem.followProgress(stream, err => err ? reject(err) : resolve());
            });
        });
    }
    
    function pullUpContainers(tag) {
        console.log('pullUpService!');
        var info = state.containers[tag];
        if (!info) return console.log('Container not running:', tag);
        state.tags
        .concat(state.scannedTags || [])
        .filter((tagSpec) => tagsMatch(tag, tagSpec))
        .forEach((tagSpec) => {
                state.busy++;
                pullUpContainer(docker, tag, info, state.dockerCreds).then(() => state.busy--);
            });
    }

    // Does a fully qualified tag match a tag pattern?
    // Currently we only implement equality or '*' matching
    function tagsMatch(tag, tagSpec) {
        return tag === tagSpec || tagSpec === '*';
    }
}


