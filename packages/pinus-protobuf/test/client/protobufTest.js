var protobuf = require('../../lib/client/protobuf');
var protobufServer = require('../../lib/protobuf');
var encoder = protobuf.encoder;
var decoder = protobuf.decoder;
var codec = protobuf.codec;
var parser = require('../../lib/parser');
var util = require('../../lib/util');
var should = require('should');
var tc = require('../testMsg');

describe('msgEncoderTest', function(){

	var protos = parser.parse(require('../example.json'));

	protobuf.init({encoderProtos:protos, decoderProtos:protos});
	protobufServer.init({encoderProtos:protos, decoderProtos:protos});

	describe('protobufTest', function(){
		for(var route in tc){
			var msg = tc[route];
			var buffer = protobuf.encode(route, msg);

			var decodeMsg = protobuf.decode(route, buffer);

			util.equal(msg, decodeMsg).should.equal(true);
		}
	});
});

function toBuffer(arr){
	var buffer = new Buffer(arr.length);

	for(var i = 0; i < arr.length; i++){
		buffer.writeUInt8(arr[i], i);
	}

	return buffer;
}