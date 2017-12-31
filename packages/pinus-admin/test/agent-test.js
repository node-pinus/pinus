var should = require('should');
var flow = require('flow');
var Master = require('../lib/masterAgent');
var Monitor = require('../lib/monitorAgent');
var ConsoleService = require('../lib/consoleService');

var WAIT_TIME = 100;

var masterHost = '127.0.0.1';
var masterPort = 3333;

describe('agent', function() {
	it('should emit a error if master agent listen a port in use', function(done) {
		var master = new Master();
		var invalidPort = 80;
		var errorCount = 0;
		master.on('error', function() {
			errorCount++;
		});
		master.listen(invalidPort);

		setTimeout(function() {
			errorCount.should.equal(1);
			done();
		}, WAIT_TIME);
	});

	it('should fail if the monitor connect to the invalid address', function(done) {
		var monitor = new Monitor({});
		var host = 'localhost';
		var invalidPort = -80;

		var errorCount = 0;
		monitor.connect(invalidPort, host, function(err) {
			should.exist(err);
			errorCount++;
		});

		setTimeout(function() {
			errorCount.should.equal(1);
			done();
		}, WAIT_TIME);
	});

	it('should forward the message from master to the right monitor and get the response by reuqest', function(done) {
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

		var masterConsole = {
		};

		var monitorConsole1 = {
			execute: function(moduleId, method, msg, cb) {
				req1Count++;
				moduleId.should.eql(moduleId1);
				cb(null, msg);
			}
		};

		var monitorConsole2 = {
			execute: function(moduleId, method, msg, cb) {
				req2Count++;
				moduleId.should.eql(moduleId2);
				cb(null, msg);
			}
		};

		var master = new Master(masterConsole);
		var monitor1 = new Monitor({
			consoleService: monitorConsole1, 
			id: monitorId1, 
			type: monitorType1
		});
		var monitor2 = new Monitor({
			consoleService: monitorConsole2, 
			id: monitorId2, 
			type: monitorType2
		});

		master.listen(masterPort);
		flow.exec(function() {
			monitor1.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			monitor2.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			master.request(monitorId1, moduleId1, msg1, function(err, resp) {
				resp1Count++;
				should.not.exist(err);
				should.exist(resp);
				resp.should.eql(msg1);
			});

			master.request(monitorId2, moduleId2, msg2, function(err, resp) {
				resp2Count++;
				should.not.exist(err);
				should.exist(resp);
				resp.should.eql(msg2);
			});
		});

		setTimeout(function() {
			req1Count.should.equal(1);
			req2Count.should.equal(1);
			resp1Count.should.equal(1);
			resp2Count.should.equal(1);

			monitor1.close();
			monitor2.close();
			master.close();

			done();
		}, WAIT_TIME);
	});

	it('should return error to master if monitor cb with a error by reuqest', function(done) {
		var monitorId = 'connector-server-1';
		var monitorType = 'connector';
		var moduleId = 'testModuleId';
		var msg = {msg: 'message to monitor'};
		var errMsg = 'some error message from monitor';

		var reqCount = 0;
		var respCount = 0;

		var masterConsole = {
		};

		var monitorConsole = {
			execute: function(moduleId, method, msg, cb) {
				reqCount++;
				moduleId.should.eql(moduleId);
				cb(new Error(errMsg));
			}
		};

		var master = new Master(masterConsole);
		var monitor = new Monitor({
			consoleService: monitorConsole, 
			id: monitorId, 
			type: monitorType
		});

		master.listen(masterPort);
		flow.exec(function() {
			monitor.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			master.request(monitorId, moduleId, msg, function(err, resp) {
				respCount++;
				should.exist(err);
				err.message.should.eql(errMsg);
				should.not.exist(resp);
			});
		});

		setTimeout(function() {
			reqCount.should.equal(1);
			respCount.should.equal(1);

			monitor.close();
			master.close();

			done();
		}, WAIT_TIME);
	});

	it('should forward the message from master to the right monitor by notifyById', function(done) {
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

		var masterConsole = {
		};

		var monitorConsole1 = {
			execute: function(moduleId, method, msg, cb) {
				req1Count++;
				moduleId.should.eql(moduleId1);
				msg.should.eql(msg1);
			}
		};

		var monitorConsole2 = {
			execute: function(moduleId, method, msg, cb) {
				req2Count++;
				moduleId.should.eql(moduleId2);
				msg.should.eql(msg2);
			}
		};

		var master = new Master(masterConsole);
		var monitor1 = new Monitor({
			consoleService: monitorConsole1, 
			id: monitorId1, 
			type: monitorType1
		});
		var monitor2 = new Monitor({
			consoleService: monitorConsole2, 
			id: monitorId2, 
			type: monitorType2
		});

		master.listen(masterPort);
		flow.exec(function() {
			monitor1.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			monitor2.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			master.notifyById(monitorId1, moduleId1, msg1);
			master.notifyById(monitorId2, moduleId2, msg2);
		});

		setTimeout(function() {
			req1Count.should.equal(1);
			req2Count.should.equal(1);

			monitor1.close();
			monitor2.close();
			master.close();

			done();
		}, WAIT_TIME);
	});

	it('should forward the message to the right type monitors by notifyByType', function(done) {
		var monitorId1 = 'connector-server-1';
		var monitorId2 = 'connector-server-2';
		var monitorId3 = 'area-server-1';
		var monitorType1 = 'connector';
		var monitorType2 = 'area';
		var moduleId1 = 'testModuleId1';
		var moduleId2 = 'testModuleId2';
		var msg1 = {msg: 'message to monitorType1'};
		var msg2 = {msg: 'message to monitorType2'};

		var req1Count = 0;
		var req2Count = 0;
		var req3Count = 0;
		var reqType1Count = 0;
		var reqType2Count = 0;

		var masterConsole = {
		};

		var monitorConsole1 = {
			execute: function(moduleId, method, msg, cb) {
				req1Count++;
				reqType1Count++;
				moduleId.should.eql(moduleId1);
				msg.should.eql(msg1);
			}
		};

		var monitorConsole2 = {
			execute: function(moduleId, method, msg, cb) {
				req2Count++;
				reqType1Count++;
				moduleId.should.eql(moduleId1);
				msg.should.eql(msg1);
			}
		};

		var monitorConsole3 = {
			execute: function(moduleId, method, msg, cb) {
				req3Count++;
				reqType2Count++;
				moduleId.should.eql(moduleId2);
				msg.should.eql(msg2);
			}
		};

		var master = new Master(masterConsole);
		var monitor1 = new Monitor({
			consoleService: monitorConsole1, 
			id: monitorId1, 
			type: monitorType1
		});
		var monitor2 = new Monitor({
			consoleService: monitorConsole2, 
			id: monitorId2, 
			type: monitorType1
		});
		var monitor3 = new Monitor({
			consoleService: monitorConsole3, 
			id: monitorId3, 
			type: monitorType2
		});

		master.listen(masterPort);
		flow.exec(function() {
			monitor1.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			monitor2.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			monitor3.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			master.notifyByType(monitorType1, moduleId1, msg1);
			master.notifyByType(monitorType2, moduleId2, msg2);
		});

		setTimeout(function() {
			req1Count.should.equal(1);
			req2Count.should.equal(1);
			req3Count.should.equal(1);
			reqType1Count.should.equal(2);
			reqType2Count.should.equal(1);

			monitor1.close();
			monitor2.close();
			monitor3.close();
			master.close();

			done();
		}, WAIT_TIME);
	});

	it('should forward the message to all monitors by notifyAll', function(done) {
		var monitorId1 = 'connector-server-1';
		var monitorId2 = 'area-server-1';
		var monitorType1 = 'connector';
		var monitorType2 = 'area';
		var orgModuleId = 'testModuleId';
		var orgMsg = {msg: 'message to all monitor'};

		var req1Count = 0;
		var req2Count = 0;

		var masterConsole = {
		};

		var monitorConsole1 = {
			execute: function(moduleId, method, msg, cb) {
				req1Count++;
				orgModuleId.should.eql(moduleId);
				msg.should.eql(orgMsg);
			}
		};

		var monitorConsole2 = {
			execute: function(moduleId, method, msg, cb) {
				req2Count++;
				orgModuleId.should.eql(moduleId);
				msg.should.eql(orgMsg);
			}
		};

		var master = new Master(masterConsole);
		var monitor1 = new Monitor({
			consoleService: monitorConsole1, 
			id: monitorId1, 
			type: monitorType1
		});
		var monitor2 = new Monitor({
			consoleService: monitorConsole2, 
			id: monitorId2, 
			type: monitorType2
		});

		master.listen(masterPort);
		flow.exec(function() {
			monitor1.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			monitor2.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			master.notifyAll(orgModuleId, orgMsg);
		});

		setTimeout(function() {
			req1Count.should.equal(1);
			req2Count.should.equal(1);

			monitor1.close();
			monitor2.close();
			master.close();

			done();
		}, WAIT_TIME);
	});

	it('should push the message from monitor to master by notify', function(done) {
		var monitorId = 'connector-server-1';
		var monitorType = 'connector';
		var orgModuleId = 'testModuleId';
		var orgMsg = {msg: 'message to master'};

		var reqCount = 0;

		var masterConsole = {
			execute: function(moduleId, method, msg, cb) {
				reqCount++;
				orgModuleId.should.eql(moduleId);
				msg.should.eql(orgMsg);
			}
		};

		var monitorConsole = {
		};

		var master = new Master(masterConsole);
		var monitor = new Monitor({
			consoleService: monitorConsole, 
			id: monitorId, 
			type: monitorType
		});

		master.listen(masterPort);
		flow.exec(function() {
			monitor.connect(masterPort, masterHost, this);
		}, 
		function(err) {
			should.not.exist(err);
			monitor.notify(orgModuleId, orgMsg);
		});

		setTimeout(function() {
			reqCount.should.equal(1);

			monitor.close();
			master.close();

			done();
		}, WAIT_TIME);
	});
});