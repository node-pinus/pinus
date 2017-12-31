var lib = process.env.POMELO_RPC_COV ? 'lib-cov' : 'lib';
var MailStation = require('../../' + lib + '/rpc-client/mailstation');
var should = require('should');
var Server = require('../../').server;
var Tracer = require('../../lib/util/tracer');

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

describe('mail station', function() {
  var gateways = [];

  before(function(done) {
    gateways = [];
    //start remote logger
    var item, opts;
    for(var i=0, l=serverList.length; i<l; i++) {
      item = serverList[i];
      opts = {
        paths: records,
        port: item.port,
        context: {id: item.id}
      };

      var gateway = Server.create(opts);
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
    it('should be ok for pass an empty opts to the factory method', function(done) {
      var station = MailStation.create();
      should.exist(station);

      station.start(function(err) {
        should.not.exist(err);
        station.stop();
        done();
      });

      station.should.have.property('mailboxFactory');
    });

    it('should change the default mailbox by pass the mailboxFactory to the create function', function() {
      var mailboxFactory = {
        create: function(opts, cb) {
          return null;
        }
      };

      var opts = {
        mailboxFactory: mailboxFactory
      };

      var station = MailStation.create(opts);
      should.exist(station);

      station.should.have.property('mailboxFactory');
      station.mailboxFactory.should.equal(mailboxFactory);
    });
  });

  describe('#addServer', function() {
    it('should add the server info into the mail station', function() {
      var station = MailStation.create();
      should.exist(station);

      var i, l;
      for(i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var servers = station.servers, item, server;
      for(i=0, l=serverList.length; i<l; i++) {
        item = serverList[i];
        server = servers[item.id];
        should.exist(server);
        server.should.equal(item);
      }
    });
  });

  describe('#dispatch', function() {
    it('should send request to the right remote server and get the response from callback function', function(done) {
      var callbackCount = 0;
      var count = 0;
      var station = MailStation.create();
      should.exist(station);

      for(var i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var func = function(id) {
        return function(err, remoteId) {
          should.exist(remoteId);
          remoteId.should.equal(id);
          callbackCount++;
        };
      };
      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        var item;
        for(var i=0, l=serverList.length; i<l; i++) {
          count++;
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func(item.id));
        }
      });
      setTimeout(function() {
        callbackCount.should.equal(count);
        station.stop();
        done();
      }, WAIT_TIME);
    });

    it('should send request to the right remote server and get the response from callback function', function(done) {
      var callbackCount = 0;
      var count = 0;
      var station = MailStation.create();
      should.exist(station);

      for(var i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var func = function(id) {
        return function(err, remoteId) {
          should.exist(remoteId);
          remoteId.should.equal(id);
          callbackCount++;
        };
      };

      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        var item;
        for(var i=0, l=serverList.length; i<l; i++) {
          count++;
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func(item.id));
        }
      });
      setTimeout(function() {
        callbackCount.should.equal(count);
        station.stop();
        done();
      }, WAIT_TIME);
    });

    it('should update the mailbox map by add server after start', function(done) {
      var callbackCount = 0;
      var count = 0;
      var station = MailStation.create();
      should.exist(station);

      for(var i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        // add area server
        var item = serverList[0];
        station.addServer(item);
        station.dispatch(tracer, item.id, msg, null, function(err, remoteId) {
          should.exist(remoteId);
          remoteId.should.equal(item.id);
          callbackCount++;
        });
      });
      setTimeout(function() {
        callbackCount.should.equal(1);
        station.stop();
        done();
      }, WAIT_TIME);
    });

    it('should emit error info and forward message to blackhole if fail to connect to remote server in lazy connect mode', function(done) {
      // mock data
      var serverId = 'invalid-server-id';
      var server = {id: serverId, type: 'invalid-server', host: 'localhost', port: 1234};
      var callbackCount = 0;
      var eventCount = 0;
      var station = MailStation.create();
      should.exist(station);

      station.addServer(server);

      station.on('error', function(err) {
        should.exist(err);
        ('fail to connect to remote server: ' + serverId).should.equal(err.message);
        eventCount++;
      });

      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        should.exist(station);
        station.dispatch(tracer, serverId, msg, null, function(err) {
          should.exist(err);
          'message was forward to blackhole.'.should.equal(err.message);
          callbackCount++;
        });
      });
      setTimeout(function() {
        eventCount.should.equal(1);
        callbackCount.should.equal(1);
        station.stop();
        done();
      }, WAIT_TIME);
    });
  });

  describe('#close', function() {
    it('should emit a close event for each mailbox close', function(done) {
      var closeEventCount = 0, i, l;
      var remoteIds = [];
      var mailboxIds = [];

      for(i=0, l=serverList.length; i<l; i++) {
        remoteIds.push(serverList[i].id);
      }
      remoteIds.sort();

      var station = MailStation.create();
      should.exist(station);

      for(i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var func = function(id) {
        return function(err, remoteId) {
          should.exist(remoteId);
          remoteId.should.equal(id);
        };
      };

      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        // invoke the lazy connect
        var item;
        for(var i=0, l=serverList.length; i<l; i++) {
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func(item.id));
        }

        station.on('close', function(mailboxId) {
          mailboxIds.push(mailboxId);
          closeEventCount++;
        });
      });

      setTimeout(function() {
        station.stop(true);
        setTimeout(function() {
          closeEventCount.should.equal(remoteIds.length);
          mailboxIds.sort();
          mailboxIds.should.eql(remoteIds);
          done();
        }, WAIT_TIME);
      }, WAIT_TIME);
    });

    it('should return an error when try to dispatch message by a closed station', function(done) {
      var errorEventCount = 0;
      var i, l;

      var station = MailStation.create();
      should.exist(station);

      for(i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var func = function(err, remoteId, attach) {
        should.exist(err);
        errorEventCount++;
      };

      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        station.stop();
        var item;
        for(i=0, l=serverList.length; i<l; i++) {
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func);
        }
      });
      setTimeout(function() {
        errorEventCount.should.equal(serverList.length);
        done();
      }, WAIT_TIME);
    });
  });

  describe('#filters', function() {
    it('should invoke filters in turn', function(done) {
      var preFilterCount = 0;
      var afterFilterCount = 0;
      var sid = 'connector-server-1';
      var orgMsg = msg;
      var orgOpts = {something: 'hello'};
      var station = MailStation.create();
      should.exist(station);

      for(var i=0, l=serverList.length; i<l; i++) {
        station.addServer(serverList[i]);
      }

      var tracer = new Tracer(null, false); 

      station.start(function(err) {
        station.before(function(fsid, fmsg, fopts, next) {
          preFilterCount.should.equal(0);
          afterFilterCount.should.equal(0);
          fsid.should.equal(sid);
          fmsg.should.equal(msg);
          fopts.should.equal(orgOpts);
          preFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.before(function(fsid, fmsg, fopts, next) {
          preFilterCount.should.equal(1);
          afterFilterCount.should.equal(0);
          fsid.should.equal(sid);
          fmsg.should.equal(msg);
          fopts.should.equal(orgOpts);
          preFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.after(function(fsid, fmsg, fopts, next) {
          preFilterCount.should.equal(2);
          afterFilterCount.should.equal(0);
          fsid.should.equal(sid);
          fmsg.should.equal(msg);
          fopts.should.equal(orgOpts);
          afterFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.after(function(fsid, fmsg, fopts, next) {
          preFilterCount.should.equal(2);
          afterFilterCount.should.equal(1);
          fsid.should.equal(sid);
          fmsg.should.equal(msg);
          fopts.should.equal(orgOpts);
          afterFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.dispatch(tracer, sid, orgMsg, orgOpts, function() {});
      });

      setTimeout(function() {
        preFilterCount.should.equal(2);
        afterFilterCount.should.equal(2);
        station.stop();
        done();
      }, WAIT_TIME);
    });
  });
});
