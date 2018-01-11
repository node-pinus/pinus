var net = require('net');

/**
 *
 * @type {Connection}
 */
var mqttCon = require('mqtt-connection');
var server = new net.Server();
var num = 300;
var len = num * num;
var i = 1;

var start = 0;
server.on('connection', function(stream) {

	var conn = mqttCon(stream);

	conn.on('connect', function() {
		console.log('connected');
	});

	conn.on('publish', function(packet) {
		// console.log(packet);
		conn.puback({
			messageId: packet.messageId
		})
	});

	conn.on('pingreq', function() {
		conn.pingresp();
	});
	// conn is your MQTT connection!
});

server.listen(1883)
console.log('server started.');