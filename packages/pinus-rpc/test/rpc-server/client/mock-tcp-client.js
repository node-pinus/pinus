var net = require'net';
var EventEmitter = require('events').EventEmitter;
var util = require'util';
var utils = require('../../../lib/util/utils');
var Composer = require'stream-pkg';

var Client = function() {
  EventEmitter.call(this);
  this.requests = {};
  this.curId = 0;
  this.composer = new Composer();
  this.socket = null;
};
util.inherits(Client, EventEmitter);

var pro = Client.prototype;

pro.connect = function(host, port, cb) {
  this.socket = net.connect({port: port, host: host}, function() {
    utils.invokeCallback(cb);
  });
  console.log('socket: %j', !!this.socket);
  var self = this;
  this.socket.on('data', function(data) {
    self.composer.feed(data);
  });

  this.composer.on('data', function(data) {
    var pkg = JSON.parse(data.toString());
    var cb = self.requests[pkg.id];
    delete self.requests[pkg.id];

    if(!cb) {
      return;
    }

    cb.apply(null, pkg.resp);
  });
};

pro.send = function(msg, cb) {
  var id = this.curId++;
  this.requests[id] = cb;
  this.socket.write(this.composer.compose(JSON.stringify({id: id, msg: msg})));
};

pro.close = function() {
  this.socket.end();
};

module.exports.create = function(opts) {
  return new Client();
};