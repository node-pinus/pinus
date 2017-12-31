var should = require('should');
var flow = require('flow');
var ConsoleService = require('..');

var WAIT_TIME = 100;

var masterHost = '127.0.0.1';
var masterPort = 3333;

describe('console service', function() {
	it('should forward message from master to the monitorHandler method of the module of the right monitor, and get the response by masterAgent.request', function(done) {
		var monitorId1 = 'connector-server-1';
		var monitorId2 = 'area-server-1';
		var monitorType1 = 'connector';
		var monitorType2 = 'area';
		var moduleId1 = 'testModuleId1';
		var moduleId2 = 'testModuleId2';
		var msg1 = {msg: 'message to monitor1'};
		var msg2 = {msg: 'message to monitor2'};

		var req1Count = 0;
		var req2Count = 0;
		var resp1Count = 0;
		var resp2Count = 0;

		var masterConsole = ConsoleService.createMasterConsole({
			port: masterPort
		});

		var monitorConsole1 = ConsoleService.createMonitorConsole({
			host: masterHost, 
			port: masterPort, 
			id: monitorId1, 
			type: monitorType1
		});

		monitorConsole1.register(moduleId1, {
			monitorHandler: function(agent, msg, cb) {
				req1Count++;
				should.exist(msg);
				msg.should.eql(msg1);
				cb(null, msg);
			}
		});

		var monitorConsole2 = ConsoleService.createMonitorConsole({
			host: masterHost, 
			port: masterPort, 
			id: monitorId2, 
			type: monitorType2
		});

		monitorConsole2.register(moduleId2, {
			monitorHandler: function(agent, msg, cb) {
				req2Count++;
				should.exist(msg);
				msg.should.eql(msg2);
				cb(null, msg);
			}
		});

		flow.exec(function() {
			masterConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			monitorConsole1.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			monitorConsole2.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			masterConsole.agent.request(monitorId1, moduleId1, msg1, function(err, resp) {
				resp1Count++;
				should.not.exist(err);
				should.exist(resp);
				resp.should.eql(msg1);
			});

			masterConsole.agent.request(monitorId2, moduleId2, msg2, function(err, resp) {
				resp2Count++;
				should.not.exist(err);
				should.exist(resp);
				resp.should.eql(msg2);
			});
		});		// end of flow.exec

		setTimeout(function() {
			req1Count.should.equal(1);
			req2Count.should.equal(1);
			resp1Count.should.equal(1);
			resp2Count.should.equal(1);

			monitorConsole1.stop();
			monitorConsole2.stop();
			masterConsole.stop();
			done();
		}, WAIT_TIME);
	});

	it('should forward message from monitor to the masterHandler of the right module of the master by monitor.notify', function(done) {
		var monitorId = 'connector-server-1';
		var monitorType = 'connector';
		var moduleId = 'testModuleId';
		var orgMsg = {msg: 'message to master'};

		var reqCount = 0;

		var masterConsole = ConsoleService.createMasterConsole({
			port: masterPort
		});

		masterConsole.register(moduleId, {
			masterHandler: function(agent, msg, cb) {
				reqCount++;
				should.exist(msg);
				msg.should.eql(orgMsg);
			}
		});

		var monitorConsole =ConsoleService.createMonitorConsole({
			host: masterHost, 
			port: masterPort, 
			id: monitorId, 
			type: monitorType
		});

		flow.exec(function() {
			masterConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			monitorConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			monitorConsole.agent.notify(moduleId, orgMsg);
		});		// end of flow.exec

		setTimeout(function() {
			reqCount.should.equal(1);

			monitorConsole.stop();
			masterConsole.stop();
			done();
		}, WAIT_TIME);
	});

	it('should fail if the module is disable', function(done) {
		var monitorId = 'connector-server-1';
		var monitorType = 'connector';
		var moduleId = 'testModuleId';
		var orgMsg = {msg: 'message to someone'};

		var masterConsole = ConsoleService.createMasterConsole({
			port: masterPort
		});

		masterConsole.register(moduleId, {
			masterHandler: function(agent, msg, cb) {
				// should not come here
				true.should.not.be.ok();
			}
		});

		var monitorConsole = ConsoleService.createMonitorConsole({
			host: masterHost, 
			port: masterPort, 
			id: monitorId, 
			type: monitorType
		});

		monitorConsole.register(moduleId, {
			monitorHandler: function(agent, msg, cb) {
				// should not come here
				true.should.not.be.ok();
			}
		});

		flow.exec(function() {
			masterConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			masterConsole.disable(moduleId);
			monitorConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			monitorConsole.disable(moduleId);
			monitorConsole.agent.notify(moduleId, orgMsg);
			masterConsole.agent.notifyById(monitorId, moduleId, orgMsg);
		});		// end of flow.exec

		setTimeout(function() {
			monitorConsole.stop();
			masterConsole.stop();
			done();
		}, WAIT_TIME);
	});

	it('should fail if the monitor not exists', function(done) {
		var monitorId = 'connector-server-1';
		var moduleId = 'testModuleId';
		var orgMsg = {msg: 'message to someone'};

		var masterConsole = ConsoleService.createMasterConsole({
			port: masterPort
		});

		flow.exec(function() {
			masterConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			masterConsole.agent.request(monitorId, moduleId, orgMsg, function(err, resp) {
				should.exist(err);
				should.not.exist(resp);
			});
		});		// end of flow.exec

		setTimeout(function() {
			masterConsole.stop();
			done();
		}, WAIT_TIME);
	});

	it('should invoke masterHandler periodically in pull mode', function(done) {
		var moduleId = 'testModuleId';
		var intervalSec = 1;
		var invokeCount = 0;
		var turn = 2;

		var masterConsole = ConsoleService.createMasterConsole({
			port: masterPort
		});

		masterConsole.register(moduleId, {
			type: 'pull', 
			interval: intervalSec, 
			masterHandler: function(agent, msg, cb) {
				invokeCount++;
			}
		});

		masterConsole.start();

		setTimeout(function() {
			invokeCount.should.equal(turn);
			masterConsole.stop();
			done();
		}, intervalSec * (turn - 0.5) * 1000);
	});

	it('should invoke monitorHandler periodically in push mode', function(done) {
		var monitorId = 'connector-server-1';
		var monitorType = 'connector';
		var moduleId = 'testModuleId';
		var intervalSec = 1;
		var invokeCount = 0;
		var turn = 2;

		var masterConsole = ConsoleService.createMasterConsole({
			port: masterPort
		});

		var monitorConsole = ConsoleService.createMonitorConsole({
			host: masterHost, 
			port: masterPort, 
			id: monitorId, 
			type: monitorType
		});

		monitorConsole.register(moduleId, {
			type: 'push', 
			interval: intervalSec, 
			monitorHandler: function(agent, msg, cb) {
				invokeCount++;
			}
		});

		flow.exec(function() {
			masterConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
			monitorConsole.start(this);
		}, 
		function(err) {
			should.not.exist(err);
		});

		setTimeout(function() {
			invokeCount.should.equal(turn);
			monitorConsole.stop();
			masterConsole.stop();
			done();
		}, intervalSec * (turn - 0.5) * 1000);
	});
});