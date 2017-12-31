var lib = process.env.POMELO_RPC_COV ? 'lib-cov' : 'lib';
var route = require('../../' + lib + '/rpc-server/dispatcher').route;
var should = require('should');
var Tracer = require('../../lib/util/tracer');

var WAIT_TIME = 20;

var services = {
  'user': {
    addOneService: {
      doService: function(num, cb) {
        cb(null, num + 1);
      }
    }
  },
  'sys': {
    addTwoService: {
      doService: function(num, cb) {
        cb(null, num + 2);
      }
    }
  }
};

var tracer = new Tracer(console, false);

describe('dispatcher', function() {
  it('should be find the right service object', function(done) {
    var methodStr = 'doService';
    var serviceStr1 = 'addOneService';
    var serviceStr2 = 'addTwoService';
    var namespace1 = 'user';
    var namespace2 = 'sys';
    var value = 1;
    var callbackCount = 0;

    var msg1 = {namespace: namespace1, service: serviceStr1, method: methodStr, args: [value]};
    route(tracer, msg1, services, function(err, result) {
      should.not.exist(err);
      should.exist(result);
      result.should.equal(value + 1);
      callbackCount++;
    });

    var msg2 = {namespace: namespace2, service: serviceStr2, method: methodStr, args: [value]};
    route(tracer, msg2, services, function(err, result) {
      should.not.exist(err);
      should.exist(result);
      result.should.equal(value + 2);
      callbackCount++;
    });

    //wait for all finished
    setTimeout(function() {
      callbackCount.should.equal(2);
      done();
    }, WAIT_TIME);
  });

  it('should return an error if the service or method not exist', function(done) {
    var serviceStr1 = 'addZeroService';
    var methodStr1 = 'doService';
    var serviceStr2 = 'addOneService';
    var methodStr2 = 'doOtherServcie';
    var namespace = 'user';
    var value = 1;
    var callbackCount = 0;

    var msg1 = {namespace: namespace, service: serviceStr1, method: methodStr1, args: [value]};
    route(tracer, msg1, services, function(err, result) {
      should.exist(err);
      should.not.exist(result);
      callbackCount++;
    });

    var msg2 = {namespace: namespace, service: serviceStr2, method: methodStr2, args: [value]};
    route(tracer, msg2, services, function(err, result) {
      should.exist(err);
      should.not.exist(result);
      callbackCount++;
    });

    //wait for all finished
    setTimeout(function() {
      callbackCount.should.equal(2);
      done();
    }, WAIT_TIME);
  });
});
