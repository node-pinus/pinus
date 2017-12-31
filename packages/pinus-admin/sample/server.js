var MasterConsole = require('../lib/consoleService');
var TestModule = require('./module');
var port = 3300;
var host = 'localhost';

var opts = {
	port: port,
	master: true
}

var masterConsole = MasterConsole.createMasterConsole(opts);
var module = TestModule();
masterConsole.register(TestModule.moduleId, module);

masterConsole.start(function() {

})