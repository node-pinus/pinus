import {} from 'mocha';
import 'should';

let protobuf = require('../../lib/client/protobuf');
let encoder = protobuf.encoder;
let decoder = protobuf.decoder;
let codec = protobuf.codec;
let parser = require('../../lib/parser');
let util = require('../../lib/util');
let tc = require('../rootMsgTC');

describe('msgEncoderTest', function () {

    let protos = parser.parse(require('../example.json'));

    protobuf.init({encoderProtos: protos, decoderProtos: protos});

    it('protobufTest', function () {
        for (let route in tc) {
            let msg = tc[route];

            console.log('====================');
            console.log(route);

            let buffer = protobuf.encode(route, msg);

            console.log(msg);
            console.log(buffer.length);

            let decodeMsg = protobuf.decode(route, buffer);

            console.log(decodeMsg);
            console.log('====================');

            util.equal(msg, decodeMsg).should.equal(true);
        }
    });
});