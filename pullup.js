module.exports = function ({emitter, state, docker}) {
    emitter.on('push', ({tag}) => {
        var containerInfo = state.containers[tag];
        if (!containerInfo) return console.log('Container not running:', tag);
        state.tags
        .concat(state.scannedTags || [])
        .filter((tagSpec) => tagsMatch(tag, tagSpec))
        .forEach((tagSpec) => {
                state.busy++;
                pullUp(docker, tag, containerInfo, () => {
                    state.busy--;
                })
            });
    });
}

// Does a fully qualified tag match a tag pattern?
// Currently we only implement equality or '*' matching
function tagsMatch(tag, tagSpec) {
    return tag === tagSpec || tagSpec === '*';
}

function pullUp(docker, repoTag, containerInfo, cb) {
    console.log('pullUp:', repoTag, containerInfo);
    if (!containerInfo.id) return error('Error getting tag');
    var oldC = docker.getContainer(containerInfo.id);
    var newC;
    docker.pull(repoTag, (err, stream) => {
      docker.modem.followProgress(stream, createContainer);
    });
    function createContainer() {
        var info = oldC.inspect((err, info) => {
            info.Config.Hostname = ''; // copied from conduit... might need to be validated?
            docker.createContainer(info.Config, (err, container) => {
                if (err) return error('Error creating new container, aborting', err);
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
            if (err) return error('FATAL: Pullup has killed your website! Could not start container: '+repoTag, err);
            console.log('Container started: '+repoTag);
            cb(null);  // success!
        });
    }
    function error(message, err) {
        console.log(message);
        console.log(err);
        cb(err);
    }
}
