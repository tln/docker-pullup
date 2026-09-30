const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async function ({emitter, docker, state}) {
    if (!process.env.PULLUP_GCR_CREDS) return;
    let creds = readGoogleAppCreds();
    state.dockerCreds = creds;
    if (creds) writeDockerCliConfig(creds);
    docker.checkAuth(creds, (err, res) => {
        if (err) console.error('Error using gcr creds on docker', err.message);
        console.log('Using GCR creds result->', res);
    });
}

function readGoogleAppCreds() {
    // TODO default? silent unless pubsub set?
    let credsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credsFile) {
        console.error('Unable to find credentials file. Define GOOGLE_APPLICATION_CREDENTIALS');
        return null;
    }
    let jsonData = fs.readFileSync(credsFile, {encoding: 'utf8'});
    // Squeeze out spaces
    let password = JSON.stringify(JSON.parse(jsonData));
    // Return in form dockerode can use
    // https://github.com/apocas/dockerode/issues/285
    return {username: '_json_key', password, serveraddress: 'https://gcr.io'};
}

// `docker service update --with-registry-auth` sends the docker CLI's own
// credentials to swarm, which replace the auth stored on the service. Without
// this the CLI has none, so nodes pull anonymously and tasks fail with
// "No such image". Give the CLI the same non-expiring key dockerode uses.
function writeDockerCliConfig({username, password}) {
    let auth = Buffer.from(`${username}:${password}`).toString('base64');
    let hosts = (process.env.PULLUP_GCR_HOSTS || 'gcr.io').split(/[\s,]+/).filter(Boolean);
    let auths = Object.fromEntries(hosts.map(host => [host, {auth}]));
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pullup-docker-'));
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({auths}), {mode: 0o600});
    process.env.DOCKER_CONFIG = dir;
    console.log('gcr_auth: docker CLI credentials for', hosts.join(', '));
}
