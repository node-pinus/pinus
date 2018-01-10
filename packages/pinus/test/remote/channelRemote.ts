import * as should from 'should';
// import { describe, it } from "mocha-typescript"
import { UID, SID } from '../../lib/util/constants';
import { ScheduleOptions } from '../../lib/interfaces/IPushScheduler';
let pinus = require('../../lib/index');
let remote = require('../../lib/common/remote/frontend/channelRemote');
let SessionService = require('../../lib/common/service/sessionService');
let ChannelService = require('../../lib/common/service/channelService');
let countDownLatch = require('../../lib/util/countDownLatch');
let MockChannelManager = require('../manager/mockChannelManager');


let mockBase = process.cwd() + '/test';

let WAIT_TIME = 200;

describe('channel remote test', function () {
  describe('#pushMessage', function () {
    it('should push message the the specified clients', function (done: MochaDone) {
      let sids = [1, 2, 3, 4, 5, 6];
      let uids = [11, 12, 13];
      let frontendId = 'frontend-server-id';
      let mockRoute = 'mock-route-string';
      let mockMsg = { msg: 'some test msg' };
      let invokeCount = 0;
      let invokeUids: Array<number> = [];

      let sessionService = new SessionService();
      sessionService.sendMessageByUid = function (uid: number, msg: string) {
        mockMsg.should.eql(msg);
        invokeCount++;
        invokeUids.push(uid);
      };

      let session;
      for (let i = 0, l = sids.length, j = 0; i < l; i++) {
        session = sessionService.create(sids[i], frontendId);
        if (i % 2) {
          sessionService.bind(session.id, uids[j]);
          j++;
        }
      }

      let app = pinus.createApp({ base: mockBase });
      app.components.__connector__ = {
        send: function (reqId: number, route: string, msg: any, recvs: Array<SID>, opts: ScheduleOptions, cb: (err?: Error, resp?: any) => void) {
          app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
        }
      };
      app.components.__connector__.connector = {};
      app.components.__pushScheduler__ = {
        schedule: function (reqId: number, route: string, msg: any, recvs: Array<SID>, opts: ScheduleOptions, cb: (err?: Error, resp?: any) => void) {
          mockMsg.should.eql(msg);
          invokeCount += recvs.length;
          let sess;
          for (let i = 0; i < recvs.length; i++) {
            sess = sessionService.get(recvs[i]);
            if (sess) {
              invokeUids.push(sess.uid);
            }
          }
          cb();
        }
      };
      app.set('sessionService', sessionService);
      let channelRemote = remote(app);
      channelRemote.pushMessage(mockRoute, mockMsg, uids, { isPush: true }, function () {
        invokeCount.should.equal(uids.length);
        invokeUids.length.should.equal(uids.length);
        for (let i = 0, l = uids.length; i < l; i++) {
          invokeUids.should.containEql(uids[i]);
        }
        done();
      });
    });
  });

  describe('#broadcast', function () {
    it('should broadcast to all the client connected', function (done: MochaDone) {
      let sids = [1, 2, 3, 4, 5];
      let uids = [11, 12, 13, 14, 15];
      let frontendId = 'frontend-server-id';
      let mockRoute = 'mock-route-string';
      let mockMsg = { msg: 'some test msg' };
      let invokeCount = 0;

      let sessionService = new SessionService();
      let channelService = new ChannelService();

      let session;
      for (let i = 0, l = sids.length; i < l; i++) {
        session = sessionService.create(sids[i], frontendId);
        if (i % 2) {
          session.bind(uids[i]);
        }
      }

      let app = pinus.createApp({ base: mockBase });
      app.components.__connector__ = {
        send: function (reqId: number, route: string, msg: any, recvs: Array<SID>, opts: ScheduleOptions, cb: (err?: Error, resp?: any) => void) {
          app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
        }
      };
      app.components.__connector__.connector = {};
      app.components.__pushScheduler__ = {
        schedule: function (reqId: number, route: string, msg: any, recvs: Array<SID>, opts: ScheduleOptions, cb: (err?: Error, resp?: any) => void) {
          invokeCount++;
          mockMsg.should.eql(msg);
          should.exist(opts);
          should.equal(opts.type, 'broadcast');
          cb();
        }
      };
      app.set('sessionService', sessionService);
      app.set('channelService', channelService);
      let channelRemote = remote(app);
      channelRemote.broadcast(mockRoute, mockMsg, { type: 'broadcast' }, function () {
        invokeCount.should.equal(1);
        done();
      });
    });

    it('should broadcast to all the binded client connected', function (done: MochaDone) {
      let sids = [1, 2, 3, 4, 5, 6];
      let uids = [11, 12, 13];
      let frontendId = 'frontend-server-id';
      let mockRoute = 'mock-route-string';
      let mockMsg = { msg: 'some test msg' };
      let invokeCount = 0;
      let invokeUids = [];

      let sessionService = new SessionService();
      let channelService = new ChannelService();

      let session;
      for (let i = 0, l = sids.length, j = 0; i < l; i++) {
        session = sessionService.create(sids[i], frontendId);
        if (i % 2) {
          session.bind(uids[j]);
          j++;
        }
      }

      let app = pinus.createApp({ base: mockBase });
      app.components.__connector__ = {
        send: function (reqId: number, route: string, msg: any, recvs: Array<SID>, opts: ScheduleOptions, cb: (err?: Error, resp?: any) => void) {
          app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
        }
      };
      app.components.__connector__.connector = {};
      app.components.__pushScheduler__ = {
        schedule: function (reqId: number, route: string, msg: any, recvs: Array<SID>, opts: ScheduleOptions, cb: (err?: Error, resp?: any) => void) {
          invokeCount++;
          mockMsg.should.eql(msg);
          should.exist(opts);
          should.equal(opts.type, 'broadcast');
          true.should.equal(opts.userOptions.binded);
          cb();
        }
      };
      app.set('sessionService', sessionService);
      app.set('channelService', channelService);
      let channelRemote = remote(app);
      channelRemote.broadcast(mockRoute, mockMsg, { type: 'broadcast', userOptions: { binded: true } }, function () {
        invokeCount.should.equal(1);
        done();
      });
    });
  });
});
