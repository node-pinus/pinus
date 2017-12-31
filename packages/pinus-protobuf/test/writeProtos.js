var protobuf = require('../lib/protobuf');
var fs = require('fs');

var protoFile = "./rootMsg.json";
var protoTarget = "./rootProtos.json";
var msgFile = "./rootMsgTC";
var msgTarget = "./rootMsg.json";

var protos = protobuf.parse(require(protoFile));

console.log(protos);
fs.writeFile(protoTarget, JSON.stringify(protos, null ,2));

fs.writeFile(msgTarget, JSON.stringify(require(msgFile), null ,2));

