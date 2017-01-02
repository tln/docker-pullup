var express = require('express');
module.exports = function ({state, emitter}) {
    state.port = +(process.env.PULLUP_PORT||1996);
    state.info = '';
    var app = express();
    app.set('json spaces', 4);
    app.use(parseJson);
    emitter.on('start', () => { server = app.listen(state.port); });
    emitter.on('stop', () => server.close());
    return app;
}

// Parse JSON from request, unconditionally
function parseJson(req, res, next) {
    var data='';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
        data += chunk;
    });

    req.on('end', function() {
        if (data) {
            req.body = JSON.parse(data);
        }
        next();
    });
}
