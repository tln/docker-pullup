function pullUpContainer(docker, repoTag, containerInfo, authconfig) {
    return new Promise((resolve, reject) => {
        if (!containerInfo.id) return error('Error getting tag');
        var oldC = docker.getContainer(containerInfo.id);
        var newC;
        docker.pull(repoTag, {authconfig}, (err, stream) => {
            if (err) console.error("Error pulling", repoTag, err);
            else docker.modem.followProgress(stream, createContainer);
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
function generateCreateRequestFromCurrentInfo(info) {
    var result = Object.assign(info.Config);
    
    // Logic copied from conduit... might need to be validated?
    result.Hostname = '';

    // We copy the entire HostConfig, although the only thing
    // currently known to be needed is the ports
    result.HostConfig = info.HostConfig;
    
    return result;
}

module.exports = pullUpContainer;
