var should = require('should');
var Server = require('../../').server;
var Client = require('../../').client;

var WAIT_TIME = 100;

// proxy records
var records = [
  {namespace: 'user', serverType: 'area', path: __dirname + '../../mock-remote/area'},
  {namespace: 'sys', serverType: 'connector', path: __dirname + '../../mock-remote/connector'}
];

// server info list
var serverList = [
  {id: 'area-server-1', type: "area", host: '127.0.0.1',  port: 3333},
  {id: 'connector-server-1', type: "connector", host: '127.0.0.1',  port: 4444},
  {id: 'connector-server-2', type: "connector", host: '127.0.0.1',  port: 5555},
];

// rpc description message
var msg = {
  namespace: 'user',
  serverType: 'area',
  service: 'whoAmIRemote',
  method: 'doService',
  args: []
};

describe('client', function() {
  var gateways = [];

  before(function(done) {
    gateways = [];
    //start remote servers
    var item, opts, gateway;
    for(var i=0, l=serverList.length; i<l; i++) {
      item = serverList[i];
      opts = {
        paths: records,
        port: item.port,
        context: {id: item.id}
      };

      gateway = Server.create(opts);
      gateways.push(gateway);
      gateway.start();
    }
    done();
  });

  after(function(done) {
    //stop remote servers
    for(var i=0; i<gateways.length; i++) {
      gateways[i].stop();
    }
    done();
  });

  describe('#create', function() {
    it('should be ok for creating client with an empty opts', function(done) {
      var client = Client.create();

      should.exist(client);

      client.start(function(err) {
        should.not.exist(err);
        client.stop(true);
        done();
      });
    });

    it('should add proxy instances by addProxies method', function() {
      var client = Client.create();

      should.exist(client);

      client.addProxies(records);

      var proxies = client.proxies, item;
      for(var i=0, l=records.length; i<l; i++) {
        item = records[i];
        proxies.should.have.property(item.namespace);
        proxies[item.namespace].should.have.property(item.serverType);
      }
    });

    it('should replace the default router by pass a opts.route to the create function', function(done) {
      var routeCount = 0, server = serverList[1], serverId = server.id, callbackCount = 0;

      var router = {
        id: 'aaa',
        route: function(msg, routeParam, servers, cb) {
          routeCount++;
          cb(null, serverId);
        }
      };

      var opts = {
        router: router
      };

      var client = Client.create(opts);
      client.addProxies(records);
      client.addServer(serverList[1]);

      client.start(function(err) {
        should.not.exist(err);
        client.proxies.sys.connector.whoAmIRemote.doService(null, function(err, sid) {
          callbackCount++;
          serverId.should.equal(sid);
        });
      });

      setTimeout(function() {
        routeCount.should.equal(1);
        callbackCount.should.equal(1);
        client.stop();
        done();
      }, WAIT_TIME);
    });
  });

  describe('#status', function() {
    it('should return an error if start twice', function(done) {
      var client = Client.create();
      client.start(function(err) {
        should.not.exist(err);
        client.start(function(err) {
          should.exist(err);
          done();
        });
      });
    });

    it('should ignore the later operation if stop twice', function(done) {
      var client = Client.create();
      client.start(function(err) {
        should.not.exist(err);
        client.stop();
        client.stop();
        done();
      });
    });

    it('should return an error if try to do rpc invoke when the client not start', function(done) {
      var client = Client.create();
      var sid = serverList[0].id;

      client.rpcInvoke(sid, msg, function(err) {
        should.exist(err);
        done();
      });
    });

    it('should return an error if try to do rpc invoke after the client stop', function(done) {
      var client = Client.create();
      var sid = serverList[0].id;

      client.addServer(serverList[0]);

      client.start(function() {
        client.rpcInvoke(sid, msg, function(err) {
          should.not.exist(err);
          client.stop(true);
          setTimeout(function() {
            client.rpcInvoke(sid, msg, function(err) {
              should.exist(err);
              done();
            });
          }, WAIT_TIME);
        });
      });
    });

  });
});
