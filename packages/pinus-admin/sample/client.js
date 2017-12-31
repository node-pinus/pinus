var MonitorConsole = require('../lib/consoleService');
var TestModule = require('./module');
var port = 3300;
// var host = '192.168.131.1';
var host = 'localhost';

var opts = {
	id: 'test-server-1',
	type: 'test',
	host: host,
	port: port,
	info: {
		id: 'test-server-1',
		host: host,
		port: 4300
	}
}

var monitorConsole = MonitorConsole.createMonitorConsole(opts);
var module = TestModule();
monitorConsole.register(TestModule.moduleId, module);

monitorConsole.start(function() {

})