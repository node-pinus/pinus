var lib = process.env.POMELO_RPC_COV ? 'lib-cov' : 'lib';
var should = require('should');
var route = require('../../' + lib + '/rpc-client/router').route;

var WAIT_TIME = 20;

describe('router', function() {
  var servers = {
    'logic': [
      {id: 'logic-server-1', host: 'localhost',  port: 3333},
      {id: 'logic-server-2', host: 'localhost',  port: 4444}
    ],
    'area': [
      {id: 'area-servere-1', host: 'localhost',  port: 5555}
    ]
  };

  var msg = {
    'serverType': 'logic',
    'service': 'rpcRemote',
    'method': 'someMethod',
    'args': []
  };

  var session = {
    'uid': 'changchang005@gmail.com'
  };

  describe("#route", function() {
    it('should return the same result for the same user if the mapping info not changed', function(done) {
      var firstRoute, secondRoute;

      route(session, msg, servers, function(err, sid) {
        should.exist(sid);
        firstRoute = sid;
      });

      route(session, msg, servers, function(err, sid) {
        should.exist(sid);
        secondRoute = sid;
      });

      setTimeout(function() {
        firstRoute.should.equal(secondRoute);
        done();
      }, WAIT_TIME);
    });

    it('should return an error if try to route to an invalid server type', function(done) {
      var invalidMsg = {
        'serverType': 'invalid-type',
        'service': 'rpcRemote',
        'method': 'someMethod',
        'args': []
      };

      route(session, invalidMsg, servers, function(err, sid) {
        should.exist(err);
        done();
      });
    });

    it('should be ok when session or session.uid is null', function(done) {
      var okCount = 0;
      route(null, msg, servers, function(err, sid) {
        should.exist(sid);
        okCount++;
      });

      var session = {
        'uid': null
      };

      route(session, msg, servers, function(err, sid) {
        should.exist(sid);
        okCount++;
      });

      setTimeout(function() {
        okCount.should.equal(2);
        done();
      }, WAIT_TIME);
    });
  });
});