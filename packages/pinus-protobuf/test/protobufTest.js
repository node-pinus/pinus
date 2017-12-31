var protobuf = require('../lib/protobuf');
var util = require('../lib/util');
var should = require('should');
var tc = require('./testMsg');


describe('msgEncoderTest', function(){
	var protos = protobuf.parse(require('./example.json'));
	protobuf.init({encoderProtos:protos, decoderProtos:protos});

	describe('encodeTest', function(){
		for(var route in tc){
			var msg = tc[route];
			var buffer = protobuf.encode(route, msg);

			console.log(msg);
			console.log(buffer.length);
			console.log(buffer)

			var decodeMsg = protobuf.decode(route, buffer);

			console.log(decodeMsg);

			util.equal(msg, decodeMsg).should.equal(true);
		}
	});
});