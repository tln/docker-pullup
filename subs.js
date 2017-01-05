// Set up listeners and subscriptions
var request = require('request');
var fs = require('fs');
module.exports = function ({emitter, state, app}) {
    state.subs = [];
    loadSubs(state);
    state.master = process.env.PULLUP_MASTER;
    state.baseUrl = process.env.PULLUP_BASE_URL;
    subscribeIfNeeded(state);
    app.get('/sub', (req, res) => res.json(state.subs));
    app.post('/sub', (req, res) => {
        state.subs.push(req.body.host);
        saveSubs(state);
        res.json(state.subs);
    });
    emitter.on('hook', (event) => pushToSubs(event, state.subs));
}

const SUBS_FILE = '/tmp/subs.json';
function loadSubs(state) {
    fs.readFile(SUBS_FILE, 'utf-8', (err, data) => {
        if (err) return err.code == 'ENOENT' ? null : console.log(err);
        state.subs = JSON.parse(data);
    });
}

function saveSubs(state) {
    fs.writeFile(SUBS_FILE, JSON.stringify(state.subs), 'utf-8');
}
function subscribeIfNeeded(state) {
    if (!state.master) return;
    if (!state.baseUrl) return console.log('Need PULLUP_BASE_URL with PULLUP_MASTER');
    var json = {host: state.baseUrl};
    request({
        url: `http://${state.master}/sub`,
        method: 'POST',
        json
    }).on('error', (err) => console.log(err));
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