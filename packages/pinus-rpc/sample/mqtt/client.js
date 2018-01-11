var net = require('net'),
	mqttCon = require('mqtt-connection'),
	stream = net.createConnection(1883, '127.0.0.1'),
	conn = mqttCon(stream);
var start = null;

conn.connect({
	clientId: "test"
}, function() {
	console.log('client connected');
	start = Date.now();
	run();
});

conn.on('puback', function() {
	run();
});

conn.on('pingresp', function() {
	run();
})

var num_requests = 20000;
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
	// conn.pingreq();
	conn.publish({
		topic: "topic",
		payload: payload,
		qos: 1,
		messageId: times
	}, function() {
		// run();
	})
}