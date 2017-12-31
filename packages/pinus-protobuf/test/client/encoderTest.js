var should = require('should');
var encoder = require('../../lib/client/protobuf').codec;

describe('client encoder test', function(){
	describe('float test for 10000 times', function(){
		for(var i = 0; i < 10000; i++){
			var float = Math.random();

			var bytes = encoder.encodeFloat(float);
			var result = encoder.decodeFloat(bytes, 0);

			var diff = Math.abs(float-result);
			//console.log('float : %j, result : %j, diff : %j', float, result, diff);
			diff.should.below(0.0000001);

		}
	});

	describe('double test for 10000 times', function(){
		for(var i = 0; i < 10000; i++){
			var double = Math.random();

			var bytes = encoder.encodeDouble(double);
			var result = encoder.decodeDouble(bytes, 0);

			double.should.equal(result);
		}
	});

	describe('utf8 encode & decode test, use 1000 * 1000 test case', function(){
		var num = 1000;
		var limit = 1000;
		for(var i = 0; i < num; i++){
			var strLength = Math.ceil(Math.random()*limit);
			var arr = [];
			for(var j = 0; j < strLength; j++){
				arr.push(Math.floor(Math.random()*65536));
			}
			//arr = [ 58452, 127, 38641, 25796, 20652, 19237 ];

			var str = String.fromCharCode.apply(null, arr);

			//console.log('old arr : %j', arr);

			var length = encoder.byteLength(str);
			var buffer = new ArrayBuffer(length);
			var bytes = new Uint8Array(buffer);

			var offset = encoder.encodeStr(bytes, 0, str);
			//console.log('encode over, offset : %j, length : %j, str length : %j', offset, length, str.length);
			//console.log(bytes);
			length.should.equal.offset;

			var result = encoder.decodeStr(bytes, 0, length);


			str.length.should.equal(result.length);
			var flag = true;
			for(var m = 0; m < str.length; m++){
				if(str.charCodeAt(m) != result.charCodeAt(m)){
					console.log('error ! origin : %j, result : %j, code : %j, code 1 : %j', str, result, str.charCodeAt(m), result.charCodeAt(m));
					console.log(arr);
					flag = false;
				}
			}

			if(!flag)return;
			//console.log('str : %j, bytes : %j, result : %j', str, bytes, result);
		}
	});

	describe('string decode speed test', function(){
		var array = [];
		var length = 100000;
		for(var i = 0; i < length; i++,array.push(0));
		var start = Date.now();
		var str = '';
		for(var j = 0; j < length; ){
			str += String.fromCharCode.apply(null, array.slice(j, j+10000));
			j += 10000;
		}
		//var str = String.fromCharCode.apply(null, array);
		var end = Date.now();

		console.log('cost time with fromCharCode method : %j, length : %j', end-start, str.length);

		start = Date.now();
		str = '';
		for(var i = 0; i < length; i++){
			str += array[i];
		}
		end = Date.now();

		console.log('cost time by add string: %j, length : %j', end-start, str.length);
	});
});