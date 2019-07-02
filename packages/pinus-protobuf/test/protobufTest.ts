import { Protobuf } from '../lib/protobuf';

let util = require('../lib/util');
let should = require('should');
let tc = require('./testMsg');


describe('msgEncoderTest', function () {
    let protos = Protobuf.parse(require('./example.json'));
    let protobuf = new Protobuf({ encoderProtos: protos, decoderProtos: protos });

    it('encodeTest', function () {
        for (let route in tc) {
            let msg = tc[route];
            let buffer = protobuf.encode(route, msg);

            console.log(msg);
            console.log(buffer.length);
            console.log(buffer);

            let decodeMsg = protobuf.decode(route, buffer);

            console.log(decodeMsg);

            util.equal(msg, decodeMsg).should.equal(true);
        }
    });

    const COUNT = 10000;

    function TestProtbuf() {
        let len = 0;
        for (let route in tc) {
            let msg = tc[route];
            let buffer = protobuf.encode(route, msg);
            len += buffer.length;
            let decodeMsg = protobuf.decode(route, buffer);
        }
        return len;
    }

    function TestJSON() {
        let len = 0;
        for (let route in tc) {
            let msg = tc[route];
            let buffer = JSON.stringify(msg);
            len += buffer.length;
            let decodeMsg = JSON.parse(buffer);
        }
        return len;
    }

    it('test JSON time', () => {
        console.time('test JSON time');
        let len = 0;
        for (let i = 0; i < COUNT; i++) {
            len += TestJSON();
        }
        console.timeEnd('test JSON time');
        console.log('JSON length total:', len);
    });

    it('test Protobuf time', () => {
        console.time('test Protobuf time')
        let len = 0;
        for (let i = 0; i < COUNT; i++) {
            len += TestProtbuf();
        }
        console.timeEnd('test Protobuf time');
        console.log('Protobuf length total:', len);
    });
});

/*

test JSON time: 212.991ms
JSON length total: 6270000
    √ test JSON time (214ms)
test Protobuf time: 1028.058ms
Protobuf length total: 1780000
    √ test Protobuf time (1029ms)

 */