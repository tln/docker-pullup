const {spawnSync} = require('child_process');
const fs = require('fs');

module.exports = async function ({emitter, docker, state}) {
    if (!process.env.PULLUP_GCR_CREDS) return;
    let creds = readGoogleAppCreds();
    state.dockerCreds = creds;
    docker.checkAuth(creds, (err, res) => {
        if (err) console.error('Error using gcr creds on docker', err, creds);
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
    return {username: '_json_key', password, email: 'tony.lownds@gmail.com', serveraddress: 'https://gcr.io'};
}