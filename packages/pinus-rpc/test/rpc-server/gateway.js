var lib = process.env.POMELO_RPC_COV ? 'lib-cov' : 'lib';
var Gateway = require('../../' + lib + '/rpc-server/gateway');
var should = require('should');
var Client = require('./client/mock-client');

var WAIT_TIME = 100;

var services = {
  user: {
    addOneService: {
      doService: function(num, cb) {
        cb(null, num + 1);
      }
    },
    addTwoService: {
      doService: function(num, cb) {
        cb(null, num + 2);
      }
    }
  }
};

var port = 3333;
var opts = {services: services, port: port};

describe('gateway', function() {
  describe('#start', function() {
    it('should be ok when listen a valid port and emit a closed event when it closed', function(done) {
      var errorCount = 0;
      var closeCount = 0;
      var gateway = Gateway.create(opts);

      should.exist(gateway);
      gateway.on('error', function(err) {
        errorCount++;
      });
      gateway.on('closed', function() {
        closeCount++;
      });

      gateway.start();
      gateway.stop();

      setTimeout(function() {
        errorCount.should.equal(0);
        closeCount.should.equal(1);
        done();
      }, WAIT_TIME);
    });

    it('should emit an error when listen a port in use', function(done) {
      var errorCount = 0;
      var opts = {services: services, port: 80};
      var gateway = Gateway.create(opts);

      should.exist(gateway);
      gateway.on('error', function(err) {
        should.exist(err);
        errorCount++;
      });

      gateway.start();

      setTimeout(function() {
        errorCount.should.equal(1);
        done();
      }, WAIT_TIME);
    });
  });

  describe('#new message callback', function() {
    it('should route msg to the appropriate service object and return response to remote client by callback', function(done) {
      var clientCallbackCount = 0;
      var value = 1;
      var msg = {
        namespace: 'user',
        service: 'addOneService',
        method: 'doService',
        args: [value]
      };

      var gateway = Gateway.create(opts);

      should.exist(gateway);
      gateway.start();

      var client = Client.create();
      client.connect('127.0.0.1', port, function() {
        client.send(msg, function(err, result) {
          result.should.eql(value + 1);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        clientCallbackCount.should.equal(1);
        client.close();
        gateway.stop();
        done();
      }, WAIT_TIME);
    });

    it('should return an error if the service not exist', function(done) {
      var clientCallbackCount = 0;
      var value = 1;
      var msg = {
        namespace: 'user',
        service: 'addNService',
        method: 'doService',
        args: [value]
      };

      var gateway = Gateway.create(opts);

      should.exist(gateway);
      gateway.start();

      var client = Client.create();
      client.connect('127.0.0.1', port, function() {
        client.send(msg, function(err, result) {
          should.exist(err)
          should.not.exist(result);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        clientCallbackCount.should.equal(1);
        client.close();
        gateway.stop();
        done();
      }, WAIT_TIME);
    });

    it('should keep the relationship with request and response in batch rpc calls', function(done) {
      var clientCallbackCount = 0;
      var value = 1;
      var msg1 = {
        namespace: 'user',
        service: 'addOneService',
        method: 'doService',
        args: [value]
      };
      var msg2 = {
        namespace: 'user',
        service: 'addTwoService',
        method: 'doService',
        args: [value]
      };

      var gateway = Gateway.create(opts);

      should.exist(gateway);
      gateway.start();

      var client = Client.create();
      client.connect('127.0.0.1', port, function() {
        client.send(msg1, function(err, result) {
          result.should.eql(value + 1);
          clientCallbackCount++;
        });

        client.send(msg2, function(err, result) {
          result.should.eql(value + 2);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        clientCallbackCount.should.equal(2);
        client.close();
        gateway.stop();
        done();
      }, WAIT_TIME);
    });
  });
});