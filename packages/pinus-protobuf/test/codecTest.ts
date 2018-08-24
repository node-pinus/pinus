import {} from 'mocha';

let encoder = require('../lib/codec');
let should = require('should');

describe('encoder test', function () {
    it('uInt32 and uInt64 test, for encode and decode 10000 random number', function () {
        let limit = 0x7fffffffffffffff;

        let count = 10000;
        for (let i = 0; i < count; i++) {
            let num = Math.ceil(Math.random() * limit);
            let result = encoder.decodeUInt32(encoder.encodeUInt32(num));
            should.equal(num, result);
        }
    });

    it('sInt32 adn sInt64 test, for encode and decode 10000 random number', function () {
        let limit = 0xfffffffffffff;

        for (let i = 0; i < 10000; i++) {
            let flag = Math.random() > 0.5 ? 1 : -1;
            let num = Math.ceil(Math.random() * limit) * flag;

            let result = encoder.decodeSInt32(encoder.encodeSInt32(num));

            should.equal(num, result);
        }
    });
});