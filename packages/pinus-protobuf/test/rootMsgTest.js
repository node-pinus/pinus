var protobuf = require('../lib/protobuf');
var util = require('../lib/util');
var should = require('should');
var tc = require('./rootMsgTC');
var fs = require('fs');
fs.writeFileSync('rootMSG.json', JSON.stringify(tc));

describe('msgEncoderTest', function(){
	var protos = protobuf.parse(require('./rootMsg.json'));
	// console.log(protos);

	protobuf.init({encoderProtos:protos, decoderProtos:protos});

	describe('encodeTest', function(){
		// console.log('%j', tc);

		for(var route in tc){
			var msg = tc[route];

			console.log('====================');
			console.log(route);
			var buffer = protobuf.encode(route, msg);

			console.log(msg);
			console.log(buffer.length);
			// console.log(buffer);

			var decodeMsg = protobuf.decode(route, buffer);

			console.log(decodeMsg);
			console.log('====================');

			util.equal(msg, decodeMsg).should.equal(true);
		}
	});
});