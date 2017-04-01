module.exports = function ({emitter, state, docker}) {
    var pullUpContainer = require('./pullup-container');

    emitter.on('push', pullupContainerOrService);

    function pullupContainerOrService(event) {
        var {tag} = event;
        var service = state.servicesByTag[tag];
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

    function pullUpService(event, service) {
        // make a sha-qualified tag
        const pinnedTag = event.tag + '@' + event.digest;
        // call update on the service
        const updatedService = Object.assign(service.Spec);
        updatedService.TaskTemplate.ContainerSpec.Image = pinnedTag;
        updatedService.version = parseInt(service.Version.Index);
        emitter.emit('updating', {what: 'service', service: service.ID, pinnedTag});
        docker.getService(service.ID).update(updatedService, (err) => {
            if (!err) {
                emitter.emit('update', {what: 'service', service: service.ID, pinnedTag});
            } else {
                emitter.emit('updateErr', {what: 'service', service: service.ID, pinnedTag, err});
            }
        });
    }

    function pullUpContainers(tag) {
        var info = state.containers[tag];
        if (!info) return console.log('Container not running:', tag);
        state.tags
        .concat(state.scannedTags || [])
        .filter((tagSpec) => tagsMatch(tag, tagSpec))
        .forEach((tagSpec) => {
                state.busy++;
                pullUpContainer(docker, tag, info).then(() => state.busy--);
            });
    }

    // Does a fully qualified tag match a tag pattern?
    // Currently we only implement equality or '*' matching
    function tagsMatch(tag, tagSpec) {
        return tag === tagSpec || tagSpec === '*';
    }
}
