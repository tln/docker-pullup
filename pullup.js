module.exports = function ({emitter, state, docker}) {
    emitter.on('push', ({tag}) => {
        var info = state.containers[tag];
        if (!info) return console.log('Container not running:', tag);
        state.tags
        .concat(state.scannedTags || [])
        .filter((tagSpec) => tagsMatch(tag, tagSpec))
        .forEach((tagSpec) => {
                state.busy++;
                pullUp(docker, tag, info).then(() => state.busy--);
            });
    });
}

// Does a fully qualified tag match a tag pattern?
// Currently we only implement equality or '*' matching
function tagsMatch(tag, tagSpec) {
    return tag === tagSpec || tagSpec === '*';
}

function generateCreateRequestFromCurrentInfo(info) {
    var result = Object.assign(info.Config);
    
    // Logic copied from conduit... might need to be validated?
    result.Hostname = '';

    // We copy the entire HostConfig, although the only thing
    // currently known to be needed is the ports
    result.HostConfig = info.HostConfig;
    
    return result;
}


function pullUp(docker, repoTag, containerInfo) {
    return new Promise((resolve, reject) => {
        console.log('pullUp:', repoTag, containerInfo);
        if (!containerInfo.id) return error('Error getting tag');
        var oldC = docker.getContainer(containerInfo.id);
        var newC;
        docker.pull(repoTag, (err, stream) => {
            docker.modem.followProgress(stream, createContainer);
        });

        function createContainer() {
            var info = oldC.inspect((err, info) => {
                var createRequest = generateCreateRequestFromCurrentInfo(info);
                docker.createContainer(createRequest, (err, container) => {
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
                resolve();  // success!
            });
        }
        function error(message, err) {
            console.log(message);
            console.log(err);
            reject(err);
        }
    });
}

// For testing purposes, expose internal pullUp function
module.exports.pullUp = pullUp;