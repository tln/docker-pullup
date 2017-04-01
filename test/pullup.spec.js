const pshell = require('pshell');
pshell.options.echoCommand = true;
pshell.options.captureOutput = true;

const pullUpContainer = require('../pullup-container');
const Docker = require('dockerode');

// We need an extremely long timeout because we run 
// several slow docker commands 
jasmine.DEFAULT_TIMEOUT_INTERVAL = 45000;

describe('docker integration tests', function () {
  var docker_compose_conf;

  async function dockerComposeCmd(cmd) {
    let res = await pshell(`cd test && docker-compose -f ${docker_compose_conf} ${cmd}`);
    return res.stdout.trim();
  }

  // Return container id
  async function bringUpContainer() {
    await dockerComposeCmd('down');
    await dockerComposeCmd('up -d');
    return dockerComposeCmd('ps -q nginx');
  }

  afterEach(() => dockerComposeCmd('down'));

  test('pullUp works', async () => {
    docker_compose_conf = 'no-port.yml';
    let id = await bringUpContainer();
    var info = await pullUpContainer(new Docker(), 'localhost:5000/nginx', {id});
    expect(info).not.toBeNull();
  });

  test('pullUp container keeps same ports', async () => {
    docker_compose_conf = 'with-port.yml';
    let id = await bringUpContainer();
    let before = await dockerComposeCmd('ps');
    expect(before).toMatch(/0\.0\.0\.0:18000->80\/tcp/);
    
    var info = await pullUpContainer(new Docker(), 'localhost:5000/nginx', {id});
    expect(info).not.toBeNull();

    // check port (and names!)
    let after = await dockerComposeCmd('ps');
    expect(after).toMatch(/0\.0\.0\.0:18000->80\/tcp/);
  });
});
