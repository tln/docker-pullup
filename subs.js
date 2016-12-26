// Set up listeners and subscriptions
var request = require('request');
module.exports = function ({emitter, state, app}) {
    state.subs = [];
    state.master = process.env.PULLUP_MASTER;
    subscribeIfNeeded(state.master, externalPort(state.port));
    app.get('/sub', (req, res) => res.json(state.subs));
    app.post('/sub', (req, res) => {
        state.subs.push(determineHostname(req, req.body.host));
        res.json(state.subs);
    });
    emitter.on('hook', (event) => pushToSubs(event, state.subs));
}

function externalPort(port) {
    // assume the external port is same as internal one
    // TODO fix, maybe get from docker?
    return port;
}

function subscribeIfNeeded(master, externalPort) {
    if (!master) return;
    var json = {host: `:${externalPort}`};
    request({
        url: `http://${master}/sub`,
        method: 'POST',
        json
    }).on('error', (err) => console.log(err));
}

function determineHostname(req, host) {
    if (/^:/.test(host)) {
        console.log(req.ips);
        host = `[${req.ip}]${host}`;
    }
}

function pushToSubs(event, subs) {
    var json = {events: [event]}, method = 'POST';
    for (var sub of subs) {
        var url = `http://${sub}/hook`;
        console.log(url);
        request({url, method, json})
        .on('error', (err) => console.log(err));
    }
}