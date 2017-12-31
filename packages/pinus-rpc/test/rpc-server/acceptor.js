var lib = process.env.POMELO_RPC_COV ? 'lib-cov' : 'lib';
var Acceptor = require('../../' + lib + '/rpc-server/acceptor');
var should = require('should');
var Client = require('./client/mock-client');

var WAIT_TIME = 100;

var port = 3333;

describe('acceptor', function() {

  describe('#listen', function() {
    it('should be ok when listen a valid port and emit a closed event when it closed', function(done) {
      var errorCount = 0;
      var closeCount = 0;
      var acceptor = Acceptor.create(null, function(tracer, msg, cb) {});

      should.exist(acceptor);
      acceptor.on('error', function(err) {
        errorCount++;
      });
      acceptor.on('closed', function() {
        closeCount++;
      });

      acceptor.listen(port);
      acceptor.close();

      setTimeout(function() {
        errorCount.should.equal(0);
        closeCount.should.equal(1);
        done();
      }, WAIT_TIME);
    });

    it('should emit an error when listen a port in use', function(done) {
      var errorCount = 0;
      var acceptor = Acceptor.create(null, function(tracer, msg, cb) {});

      should.exist(acceptor);
      acceptor.on('error', function(err) {
        should.exist(err);
        errorCount++;
      });

      acceptor.listen(80);

      setTimeout(function() {
        errorCount.should.equal(1);
        acceptor.close();
        done();
      }, WAIT_TIME);
    });
  });

  describe('#new message callback', function() {
    it('should invoke the callback function with the same msg and return response to remote client by cb', function(done) {
      var callbackCount = 0;
      var clientCallbackCount = 0;
      var orgMsg = {
        service: 'xxx.yyy.zzz',
        method: 'someMethod',
        args: [1, 'a', {param: 100}]
      };

      var acceptor = Acceptor.create(null, function(tracer, msg, cb) {
        msg.should.eql(orgMsg);
        callbackCount++;
        cb(msg);
      });

      should.exist(acceptor);
      acceptor.listen(port);

      var client = Client.create();
      client.connect('127.0.0.1', port, function() {
        client.send(orgMsg, function(backMsg) {
          backMsg.should.eql(orgMsg);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        callbackCount.should.equal(1);
        clientCallbackCount.should.equal(1);
        client.close();
        acceptor.close();
        done();
      }, WAIT_TIME);
    });

    it('should keep the relationship with request and response in batch rpc calls', function(done) {
      var callbackCount = 0;
      var clientCallbackCount = 0;
      var orgMsg1 = {
        service: 'xxx.yyy.zzz1',
        method: 'someMethod1',
        args: [1, 'a', {param: 100}]
      };
      var orgMsg2 = {
        service: 'xxx.yyy.zzz2',
        method: 'someMethod2',
        args: [2, 'a', {param: 100}]
      };

      var acceptor = Acceptor.create(null, function(tracer, msg, cb) {
        callbackCount++;
        cb(msg);
      });
      should.exist(acceptor);
      acceptor.listen(port);

      var client = Client.create();
      client.connect('127.0.0.1', port, function() {
        client.send(orgMsg1, function(backMsg) {
          backMsg.should.eql(orgMsg1);
          clientCallbackCount++;
        });
        client.send(orgMsg2, function(backMsg) {
          backMsg.should.eql(orgMsg2);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        callbackCount.should.equal(2);
        clientCallbackCount.should.equal(2);
        client.close();
        acceptor.close();
        done();
      }, WAIT_TIME);
    });
  });
});
