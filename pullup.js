module.exports = function ({emitter, state, docker}) {
    emitter.on('push', ({tag}) => {
        state.tags
        .concat(state.scannedTags || [])
        .filter((tagSpec) => tagsMatch(tag, tagSpec))
        .forEach((tagSpec) => pullUp(docker, tag, state.containers));
    });
}

// Does a fully qualified tag match a tag pattern?
// Currently we only implement equality or '*' matching
function tagsMatch(tag, tagSpec) {
    return tag === tagSpec || tagSpec === '*';
}

function pullUp(docker, repoTag, containers) {
    var curInfo = containers[repoTag];
    console.log('pullUp:', curInfo);
    if (!curInfo.id) return console.log('Error getting tag');
    var oldC = docker.getContainer(curInfo.id);
    var newC;
    docker.pull(repoTag, (err, stream) => {
      docker.modem.followProgress(stream, createContainer);
    });
    function createContainer() {
        var info = oldC.inspect((err, info) => {
            info.Config.Hostname = ''; // copied from conduit... might need to be validated?
            docker.createContainer(info.Config, (err, container) => {
                if (err) return console.log('Error creating new container, aborting');
                newC = container;
                stopOldContainer();
            });
        });
    }
    function stopOldContainer() {
        oldC.stop(() => {
            startNewContainer();
            oldC.remove(() => {console.log('Removed container')});
        });
    }
    function startNewContainer() {
        newC.start((err, container) => {
            if (err) return fatalErrorPullupHasKilledYourWebsite(err);
            console.log('Container started: '+repoTag);
        });
    }
    function fatalErrorPullupHasKilledYourWebsite(err) {
        console.log('FATAL: Pullup has killed your website! Could not start container: '+repoTag);
        console.log(err);
    }
}
