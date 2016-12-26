// Pullup -- watches for webhook calls from a Docker private registry.
// Each module needs a subset of the given params. Modules define their
// own routes and consult environment variables for config.
var Docker = require('dockerode');
const EventEmitter = require('events');
var params = {
    state: {}, 
    docker: Docker(), 
    emitter: new EventEmitter()
};
params.app = require('./app')(params);
require('./info-api')(params);
require('./static-tags')(params);
require('./docker-scanner')(params);
require('./subs')(params);
require('./hook')(params);
require('./pullup')(params);

params.emitter.emit('start');
