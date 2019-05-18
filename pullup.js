const pshell = require('pshell');
pshell.options.echoCommand = true;

module.exports = function ({emitter, state, docker}) {
    var pullUpContainer = require('./pullup-container');

    emitter.on('push', pullupContainerOrService);

    function pullupContainerOrService(event) {
        var {tag} = event;
        var service = state.servicesByTag[tag];
        console.log('pullupContainerOrService:', tag, service);
        if (service) {
            try{
                pullUpService(event, service);
            }catch(e){
                console.error(e);
            }
        } else {
            pullUpContainers(tag);
        }
    }

    async function pullUpService(event, {ID}) {
        // make a sha-qualified tag
        console.log('pullUpService!', event);
        const pinnedTag = event.tag + '@' + event.digest;
        // call update on the service. We must get updated information because the 
        // version needs to bbe up-to-date. Otherwise we get "rpc error: code = Unknown desc = update out of sequence"
        let service = docker.getService(ID);
        service.inspect(async (err, info) => {
            if (err) {
                // TODO update error?
                console.log('Error inspecting service', err);
                return;
            }
            console.log('pullUpService inspect!', info.Spec.Name);

            docker.pull(pinnedTag, {authconfig: state.creds.docker}, (err, stream) => {
                if (err) console.error("Error pulling", pinnedTag, err);
                else docker.modem.followProgress(stream, updateService);
            });

            async function updateService() {
                // exec docker service update XXX_XXX
                let eventInfo = {what: 'service', service: ID, pinnedTag};
                emitter.emit('updating', eventInfo);
                try {
                    await pshell(`docker service update --with-registry-auth --image ${pinnedTag} ${info.Spec.Name}`);
                    emitter.emit('update', eventInfo);
                } catch (err) {
                    emitter.emit('updateErr', {err, ...eventInfo});
                }
            }

            // const updatedService = Object.assign(info.Spec);
            // updatedService.TaskTemplate.ContainerSpec.Image = pinnedTag;
            // updatedService.version = parseInt(info.Version.Index);
            // let eventInfo = {what: 'service', service: ID, pinnedTag};
            // emitter.emit('updating', eventInfo);
            // service.update(updatedService, (err) => {
            //     if (!err) {
            //         emitter.emit('update', eventInfo);
            //     } else {
            //         emitter.emit('updateErr', {err, ...eventInfo});
            //     }
            // });
        })
        docker.getService(service.ID)
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
                pullUpContainer(docker, tag, info, state.creds.docker).then(() => state.busy--);
            });
    }

    // Does a fully qualified tag match a tag pattern?
    // Currently we only implement equality or '*' matching
    function tagsMatch(tag, tagSpec) {
        return tag === tagSpec || tagSpec === '*';
    }
}
