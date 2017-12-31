var protobuf = require('../../lib/client/protobuf');
var encoder = protobuf.encoder;
var decoder = protobuf.decoder;
var codec = protobuf.codec;
var parser = require('../../lib/parser');
var util = require('../../lib/util');
var should = require('should');
var tc = require('../rootMsgTC');

describe('msgEncoderTest', function(){

	var protos = parser.parse(require('../rootMsg.json'));

	protobuf.init({encoderProtos:protos, decoderProtos:protos});

	describe('protobufTest', function(){
		for(var route in tc){
			var msg = tc[route];

			console.log('====================');
			console.log(route);

			var buffer = protobuf.encode(route, msg);

			console.log(msg);
			console.log(buffer.length);

			var decodeMsg = protobuf.decode(route, buffer);

			console.log(decodeMsg);
			console.log('====================');

			util.equal(msg, decodeMsg).should.equal(true);
		}
	});
});