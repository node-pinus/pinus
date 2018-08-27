import {} from 'mocha';
import 'should';

let encoder = require('../../lib/client/protobuf').codec;

describe('client encoder test', function () {
    it('float test for 10000 times', function () {
        for (let i = 0; i < 10000; i++) {
            let float = Math.random();

            let bytes = encoder.encodeFloat(float);
            let result = encoder.decodeFloat(bytes, 0);

            let diff = Math.abs(float - result);
            // console.log('float : %j, result : %j, diff : %j', float, result, diff);
            diff.should.below(0.0000001);

        }
    });

    it('double test for 10000 times', function () {
        for (let i = 0; i < 10000; i++) {
            let double = Math.random();

            let bytes = encoder.encodeDouble(double);
            let result = encoder.decodeDouble(bytes, 0);

            double.should.equal(result);
        }
    });

    it('utf8 encode & decode test, use 1000 * 1000 test case', function () {
        let num = 1000;
        let limit = 1000;
        for (let i = 0; i < num; i++) {
            let strLength = Math.ceil(Math.random() * limit);
            let arr = [];
            for (let j = 0; j < strLength; j++) {
                arr.push(Math.floor(Math.random() * 65536));
            }
            // arr = [ 58452, 127, 38641, 25796, 20652, 19237 ];

            let str = String.fromCharCode.apply(null, arr);

            // console.log('old arr : %j', arr);

            let length = encoder.byteLength(str);
            let buffer = new ArrayBuffer(length);
            let bytes = new Uint8Array(buffer);

            let offset = encoder.encodeStr(bytes, 0, str);
            // console.log('encode over, offset : %j, length : %j, str length : %j', offset, length, str.length);
            // console.log(bytes);
            length.should.equal.offset;

            let result = encoder.decodeStr(bytes, 0, length);


            str.length.should.equal(result.length);
            let flag = true;
            for (let m = 0; m < str.length; m++) {
                if (str.charCodeAt(m) !== result.charCodeAt(m)) {
                    console.log('error ! origin : %j, result : %j, code : %j, code 1 : %j', str, result, str.charCodeAt(m), result.charCodeAt(m));
                    console.log(arr);
                    flag = false;
                }
            }

            if (!flag) return;
            // console.log('str : %j, bytes : %j, result : %j', str, bytes, result);
        }
    });

    it('string decode speed test', function () {
        let array = [];
        let length = 100000;
        for (let i = 0; i < length; i++, array.push(0)) ;
        let start = Date.now();
        let str = '';
        for (let j = 0; j < length;) {
            str += String.fromCharCode.apply(null, array.slice(j, j + 10000));
            j += 10000;
        }
        // var str = String.fromCharCode.apply(null, array);
        let end = Date.now();

        console.log('cost time with fromCharCode method : %j, length : %j', end - start, str.length);

        start = Date.now();
        str = '';
        for (let i = 0; i < length; i++) {
            str += array[i];
        }
        end = Date.now();

        console.log('cost time by add string: %j, length : %j', end - start, str.length);
    });
});