var zmq = require('zmq');
var socket = zmq.socket('dealer');
socket.identity = 'test';
socket.connect('tcp://localhost:3331');

run();

socket.on('message', function() {
	run();
})

var num_requests = 20000;
var start = Date.now();
var times = 0;

function run() {
	if (times > num_requests) {
		return;
	}

	if (times == num_requests) {
		var now = Date.now();
		var cost = now - start;
		console.log('run %d num requests cost: %d ops/sec', num_requests, cost, (num_requests / (cost / 1000)).toFixed(2));
		times = 0;
		start = now;
		return run();
	}

	times++;

	var payload = "hello";
	socket.send(payload);
}