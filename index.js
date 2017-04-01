// Pullup -- watches for webhook calls from a Docker private registry.
// Each module needs a subset of the given params. Modules define their
// own routes and consult environment variables for config.
const Docker = require('dockerode');
const EventEmitter = require('events');
const params = {
    state: {}, 
    docker: Docker(), 
    emitter: new EventEmitter(),
};
params.app = require('./app')(params);
require('./info-api')(params);
require('./static-tags')(params);
require('./docker-scanner')(params);
require('./hook')(params);
require('./pullup')(params);
require('./idler')(params);

params.emitter.emit('start');

// For testing, export the core structure
module.exports = params;