var zmq = require('zmq');
var socket = zmq.socket('router');

socket.bind('tcp://*:3331', function(err) {
	socket.on('message', function(clientId, pkg) {
		console.log(clientId);
		console.log(pkg)
		socket.send(pkg);
	});
});