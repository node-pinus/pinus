  var Emitter = require('emitter');
  window.EventEmitter = Emitter;

  var protocol = require('pinus-protocol');
  window.Protocol = protocol;
  
  var protobuf = require('pinus-protobuf');
  window.protobuf = protobuf;
  
  var pinus = require('pinus-jsclient-websocket');
  window.pinus = pinus;
