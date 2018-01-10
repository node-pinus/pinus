import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let pomelo = require('../../lib/index');
import { SessionService, Session, FrontendSession } from '../../lib/common/service/sessionService';
import { SID, FRONTENDID, UID } from '../../lib/util/constants';
import { ISocket } from '../../lib//interfaces/ISocket';

describe('session service test', function () {
  describe('#bind', function () {
    it('should get session by uid after binded', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'changchang';
      let eventCount = 0;

      let session = service.create(sid, fid, socket);

      should.exist(session);

      session.should.eql(service.get(sid));

      session.on('bind', function (euid: number) {
        eventCount++;
        uid.should.equal(euid);
      });

      service.bind(sid, uid, function (err: Error) {
        should.not.exist(err);
        let sessions = service.getByUid(uid);
        should.exist(sessions);
        sessions.length.should.equal(1);
        session.should.eql(sessions[0]);
        eventCount.should.equal(1);
        service.bind(sid, uid, function (err: Error) {
          should.not.exist(err);
          done();
        });
      });
    });
    it('should fail if already binded uid', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'py', test_uid = 'test';

      let session = service.create(sid, fid, socket);

      service.bind(sid, uid, null);

      service.bind(sid, test_uid, function (err: Error) {
        should.exist(err);
        done();
      });
    });
    it('should fail if try to bind a session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, uid = 'changchang';

      service.bind(sid, uid, function (err: Error) {
        should.exist(err);
        done();
      });
    });
  });

  describe('#unbind', function () {
    it('should fail unbind session if session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1;
      let uid = 'py';

      service.unbind(sid, uid, function (err: Error) {
        should.exist(err);
        done();
      });
    });
    it('should fail unbind session if session not binded', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'py';

      let session = service.create(sid, fid, socket);

      service.unbind(sid, uid, function (err: Error) {
        should.exist(err);
        done();
      });
    });
    it('should fail to get session after session unbinded', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'py';

      let session = service.create(sid, fid, socket);
      service.bind(sid, uid, null);

      service.unbind(sid, uid, function (err: Error) {
        should.not.exist(err);
        let sessions = service.getByUid(uid);
        should.not.exist(sessions);
        done();
      });
    });
  });

  describe('#remove', function () {
    it('should not get the session after remove', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'changchang';

      let session = service.create(sid, fid, socket);

      service.bind(sid, uid, function (err: Error) {
        service.remove(sid);
        should.not.exist(service.get(sid));
        should.not.exist(service.getByUid(uid));
        done();
      });
    });
  });

  describe('#import', function () {
    it('should update the session with the key/value pair', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let key = 'key-1', value = 'value-1';

      let session = service.create(sid, fid, socket);

      service.import(sid, key, value, function (err: Error) {
        should.not.exist(err);
        value.should.eql(session.get(key));
        done();
      });
    });

    it('should fail if try to update a session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1;
      let key = 'key-1', value = 'value-1';

      service.import(sid, key, value, function (err: Error) {
        should.exist(err);
        done();
      });
    });

    it('should update the session with the key/value pairs', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let key = 'key-1', value = 'value-1', key2 = 'key-2', value2 = {};

      let settings: { [key: string]: any } = {};
      settings[key] = value;
      settings[key2] = value2;

      let session = service.create(sid, fid, socket);

      service.importAll(sid, settings, function (err: Error) {
        should.not.exist(err);
        value.should.eql(session.get(key));
        value2.should.eql(session.get(key2));
        done();
      });
    });

    it('should fail if try to update a session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1;
      let key = 'key-1', value = 'value-1';

      service.import(sid, key, value, function (err: Error) {
        should.exist(err);
        done();
      });
    });

    it('should fail if try to update a session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1;
      let key = 'key-1', value = 'value-1', key2 = 'key-2', value2 = {};

      let settings: { [key: string]: any } = {};
      settings[key] = value;
      settings[key2] = value2;

      service.importAll(sid, settings, function (err: Error) {
        should.exist(err);
        done();
      });
    });
  });

  describe('#kick', function () {
    it('should kick the sessions', function (done: MochaDone) {
      let service = new SessionService();
      let sid1 = 1, fid1 = 'frontend-server-1';
      let sid2 = 2, fid2 = 'frontend-server-1';
      let socket: ISocket = <any>{
        emit: function () { },
        disconnect: function () { }
      };
      let uid = 'changchang';
      let eventCount = 0;

      let session1 = service.create(sid1, fid1, socket);
      let session2 = service.create(sid2, fid2, socket);
      session1.on('closed', function () {
        eventCount++;
      });

      session2.on('closed', function () {
        eventCount++;
      });

      service.bind(sid1, uid, function (err: Error) {
        service.bind(sid2, uid, function (err: Error) {
          service.kick(uid, null, function (err: Error) {
            should.not.exist(err);
            should.not.exist(service.get(sid1));
            should.not.exist(service.get(sid2));
            should.not.exist(service.getByUid(uid));
            eventCount.should.equal(2);
            done();
          });
        });
      });
    });

    it('should kick the session by sessionId', function (done: MochaDone) {
      let service = new SessionService();
      let sid1 = 1, fid1 = 'frontend-server-1';
      let sid2 = 2, fid2 = 'frontend-server-1';

      let socket: ISocket = <any>{
        emit: function () { },
        disconnect: function () { }
      };
      let uid = 'changchang';
      let eventCount = 0;

      let session1 = service.create(sid1, fid1, socket);
      let session2 = service.create(sid2, fid2, socket);
      session1.on('closed', function () {
        eventCount++;
      });

      session2.on('closed', function () {
        eventCount++;
      });

      service.bind(sid1, uid, function (err: Error) {
        service.bind(sid2, uid, function (err: Error) {
          service.kickBySessionId(sid1, null, function (err: Error) {
            should.not.exist(err);
            should.not.exist(service.get(sid1));
            should.exist(service.get(sid2));
            should.exist(service.getByUid(uid));
            eventCount.should.equal(1);
            done();
          });
        });
      });
    });

    it('should ok if kick a session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let uid = 'changchang';

      service.kick(uid, null, function (err: Error) {
        should.not.exist(err);
        done();
      });
    });

    it('should kick session by sid', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1';
      let socket: ISocket = <any>{
        emit: function () { },
        disconnect: function () { }
      };
      let eventCount = 0;

      let session = service.create(sid, fid, socket);
      session.on('closed', function () {
        eventCount++;
      });

      service.kickBySessionId(sid, null, function (err: Error) {
        should.not.exist(err);
        should.not.exist(service.get(sid));
        eventCount.should.equal(1);
        done();
      });
    });

    it('should ok if kick a session not exist', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1;

      service.kickBySessionId(sid, null, function (err: Error) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('#forEachSession', function () {
    it('should iterate all created sessions', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let eventCount = 0;

      let outter_session = service.create(sid, fid, socket);

      service.forEachSession(function (session: any) {
        should.exist(session);
        outter_session.id.should.eql(session.id);
        done();
      });
    });
  });

  describe('#forEachBindedSession', function () {
    it('should iterate all binded sessions', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'py';

      let outter_session = service.create(sid, fid, socket);
      service.bind(sid, uid, null);

      service.forEachBindedSession(function (session: any) {
        should.exist(session);
        outter_session.id.should.eql(session.id);
        outter_session.uid.should.eql(session.uid);
        done();
      });
    });
  });
});

describe('frontend session test', function () {
  describe('#bind', function () {
    it('should get session by uid after binded', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'changchang';
      let eventCount = 0;

      let session = service.create(sid, fid, socket);
      let fsession = session.toFrontendSession();

      should.exist(fsession);

      fsession.on('bind', function (euid: number) {
        eventCount++;
        uid.should.equal(euid);
      });

      fsession.bind(uid, function (err: Error) {
        should.not.exist(err);
        let sessions = service.getByUid(uid);
        should.exist(sessions);
        sessions.length.should.equal(1);
        session.should.eql(sessions[0]);
        eventCount.should.equal(1);
        done();
      });
    });
  });

  describe('#unbind', function () {
    it('should fail to get session after session unbinded', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'py';

      let session = service.create(sid, fid, socket);
      let fsession = session.toFrontendSession();

      fsession.bind(uid, null);
      fsession.unbind(uid, function (err: Error) {
        should.not.exist(err);
        let sessions = service.getByUid(uid);
        should.not.exist(sessions);
        done();
      });
    });
  });

  describe('#set/get', function () {
    it('should update the key/value pair in frontend session but not session',
      function () {
        let service = new SessionService();
        let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
        let key = 'key-1', value = 'value-1';

        let session = service.create(sid, fid, socket);
        let fsession = session.toFrontendSession();

        fsession.set(key, value);

        should.not.exist(session.get(key));
        value.should.eql(fsession.get(key));
      });
  });

  describe('#push', function () {
    it('should push the specified key/value pair to session', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let key = 'key-1', value = 'value-1', key2 = 'key-2', value2 = {};

      let session = service.create(sid, fid, socket);
      let fsession = session.toFrontendSession();

      fsession.set(key, value);
      fsession.set(key2, value2);

      fsession.push(key, function (err: Error) {
        should.not.exist(err);
        value.should.eql(session.get(key));
        should.not.exist(session.get(key2));
        done();
      });
    });

    it('should push all the key/value pairs to session', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let key = 'key-1', value = 'value-1', key2 = 'key-2', value2 = {};

      let session = service.create(sid, fid, socket);
      let fsession = session.toFrontendSession();

      fsession.set(key, value);
      fsession.set(key2, value2);

      fsession.pushAll(function (err: Error) {
        should.not.exist(err);
        value.should.eql(session.get(key));
        value2.should.eql(session.get(key2));
        done();
      });
    });
  });

  describe('#export', function () {
    it('should equal frontend session after export', function (done: MochaDone) {
      let service = new SessionService();
      let sid = 1, fid = 'frontend-server-1', socket: ISocket = <any>{};
      let uid = 'py';

      let session = service.create(sid, fid, socket);
      let fsession = session.toFrontendSession();
      let esession: FrontendSession = <any>fsession.export();
      esession.id.should.eql(fsession.id);
      esession.frontendId.should.eql(fsession.frontendId);
      done();
    });
  });
});
