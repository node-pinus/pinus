import {Protobuf} from '../lib/protobuf';

let util = require('../lib/util');
let should = require('should');
let tc = require('./testMsg');


describe('msgEncoderTest', function () {
    let protos = Protobuf.parse(require('./example.json'));
    let protobuf = new Protobuf({encoderProtos: protos, decoderProtos: protos});

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
});