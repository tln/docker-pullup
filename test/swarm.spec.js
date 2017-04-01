// We need an extremely long timeout because we run 
// several slow docker commands
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;

beforeAll(async () => {
    await bringUpRegistry();
    startServer();
});
afterAll(async () => {
    // For a one-shot test, we need to close so that
    // node will exit
    //stopServer();
    await stopRegistry();
});

describe('docker integration tests', function () {
  var docker_compose_conf;

  test.skip('pullUp hook works', async () => {
    let worked, p = new Promise((resolve) => { 
      worked = resolve; 
    });

    _params.emitter.on('push', () => {
      //console.log('push!', arguments);
      worked();
    });

    let image = await generateNewImage();
    //console.log('image generated!');

    return p;    
  });

  test.skip('detect service works', async () => {
    let worked, p = new Promise((resolve) => { 
      worked = resolve; 
    });
    
    _params.emitter.on('push', (e) => {
      //console.log('push!', e);
      // wait a tick in case our event handler was called before other
      // event handlers
      setTimeout()
    });
    _params.emitter.on('serviceFound', (e) => {
      //console.log('serviceFound!', e);
      worked();
    });
    let id = await bringUpService();
    //console.log('service up!');

    return p;    
  });

  test('pullUp service works', async () => {
    let worked, p = new Promise((resolve) => { 
      worked = resolve; 
    });
    
    _params.emitter.on('push', (e) => {
      //console.log('push!', e);
    });
    _params.emitter.on('serviceFound', (e) => {
      //console.log('serviceFound!', e);
      //console.log(_params.state.servicesByTag);
    });
    _params.emitter.on('update', (e) => {
      //console.log('updated!', e);
      worked();
    });
    _params.emitter.on('updateErr', (e) => {
      //console.log('updateErr!', e);
    });

    let id = await bringUpService();
    //console.log('service up!');

    debugger;

    let image = await generateNewImage();
    //console.log('image generated!');

    return p;    
  });
});


// Utility functions
const pshell = require('pshell');
pshell.options.echoCommand = true;
async function pshellOut(cmd) {
  let res = await pshell(cmd, {captureOutput: true});
  return res.stdout.trim();
}

var _params;
function startServer() {
  // Start server (in this process)
  _params = require('../index.js');
}
function closeServer() {
  _params.emitter.emit('stop');
}

async function bringUpRegistry() {
  // TODO mac only
  let ip = await pshellOut(`ipconfig getifaddr en0`);
  await pshell(`cd test/registry && LOCAL_IP=${ip} docker-compose up -d`);
}
async function stopRegistry() {
  await pshell(`cd test/registry && docker-compose down`);
}

// Returns stdout I guess
async function bringUpService() {
  await pshell(`cd test && docker stack deploy --compose-file service.yml docker-pullup-test`);
}

async function generateNewImage() {
    const fs = require('fs');
    fs.writeFileSync('test/Dockerfile.gen', fs.readFileSync('test/Dockerfile') + '\nRUN echo ' + Math.random() + '\n');
    await pshell('docker build -t localhost:5000/nginx:latest -f test/Dockerfile.gen test');
    await pshell('docker push localhost:5000/nginx:latest');
    let image = await pshellOut("docker images --digests --no-trunc --format '{{.Repository}}:{{.Tag}}@{{.Digest}}' localhost:5000/nginx | head -1");
    //console.log(image);
    return image;
}



