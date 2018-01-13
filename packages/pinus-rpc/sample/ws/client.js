var WebSocket = require('ws');
var ws = new WebSocket('ws://127.0.0.1:3331');

ws.on('open', function open() {
	start = Date.now();
	run();
});

ws.on('message', function(data, flags) {
	// flags.binary will be set if a binary data is received.
	// flags.masked will be set if the data was masked.
	run();
});

var num_requests = 20000;
var start = null;
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
	ws.send(JSON.stringify({
        topic: "topic",
        payload: payload,
        qos: 1,
        messageId: times
    }));
}