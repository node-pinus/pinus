var encoder = require('../lib/codec');
var should = require('should');

describe('encoder test', function(){
	describe('uInt32 and uInt64 test, for encode and decode 10000 random number', function(){
		var limit = 0x7fffffffffffffff;

		var count = 10000;
		for(var i = 0; i < count; i++){
			var number = Math.ceil(Math.random()*limit);
			var result = encoder.decodeUInt32(encoder.encodeUInt32(number));
			should.equal(number, result);
		}
	});

	describe('sInt32 adn sInt64 test, for encode and decode 10000 random number', function(){
		var limit = 0xfffffffffffff;

		for(var i = 0; i < 10000; i++){
			var flag = Math.random>0.5?1:-1;
			var number = Math.ceil(Math.random()*limit)*flag;

			var result = encoder.decodeSInt32(encoder.encodeSInt32(number));

			should.equal(number, result);
		}
	});
});