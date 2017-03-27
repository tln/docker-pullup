const pshell = require('pshell');
pshell.options.echoCommand = true;
pshell.options.captureOutput = true;

const pullup = require('../pullup');
const Docker = require('dockerode');

test('this runs', async() => {
    await pshell('cd test && docker-compose up -d');
    var res = await pshell('cd test && docker-compose ps -q nginx');
    var id = res.stdout.trim();

    var info = await pullup.pullUp(new Docker(), 'localhost:5000/nginx', { id });
    console.log(info);

    // get docker container info
    expect(info).not.toMatchObject({
        // TODO validate ports
    });

    console.log(info);
});