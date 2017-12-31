var logger = require('pomelo-logger').getLogger('pomelo-admin', 'test_module');

var DEFAULT_INTERVAL = 5; // in second
var DEFAULT_DELAY = 1; // in second

module.exports = function(opts) {
	return new Module(opts);
};

module.exports.moduleId = 'test_module';

var Module = function(opts) {
	opts = opts || {};
	this.type = opts.type || 'pull';
	this.interval = opts.interval || DEFAULT_INTERVAL;
	this.delay = opts.delay || DEFAULT_DELAY;
};

Module.prototype.monitorHandler = function(agent, msg, cb) {
	console.log('monitorHandler %j', msg);
	// agent.notify(module.exports.moduleId, {
	// 	serverId: agent.id,
	// 	body: {
	// 		hello: 'ok'
	// 	}
	// });
	cb(null, 'ok');
};

Module.prototype.masterHandler = function(agent, msg, cb) {
	if (!msg) {
		// agent.notifyAll(module.exports.moduleId);
		var sendMsg = {
			id: Date.now()
		}
		agent.request('test-server-1', module.exports.moduleId, sendMsg, function(err, r) {
			if (err) {
				console.error(err);
			}

			if (r) {
				console.log(r);
			}
		})
		return;
	}
	console.log('masterHandler %j', msg);
};

Module.prototype.clientHandler = function(agent, msg, cb) {
	console.log('clientHandler %j', msg);
};