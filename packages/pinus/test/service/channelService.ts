import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let pinus = require('../../lib/index');
let ChannelService = require('../../lib/common/service/channelService');

let channelName = 'test_channel';
let mockBase = process.cwd() + '/test';
let mockApp = { serverId: 'test-server-1' };

describe('channel manager test', function () {
  describe('#createChannel', function () {
    it('should create and return a channel with the specified name', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);
      channelName.should.equal(channel.name);
    });

    it('should return the same channel if the name has already existed', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);
      channelName.should.equal(channel.name);
      let channel2 = channelService.createChannel(channelName);
      channel.should.equal(channel2);
    });
  });

  describe('#destroyChannel', function () {
    it('should delete the channel instance', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);
      channelName.should.equal(channel.name);
      channelService.destroyChannel(channelName);
      let channel2 = channelService.createChannel(channelName);
      channel.should.not.equal(channel2);
    });
  });

  describe('#getChannel', function () {
    it('should return the channel with the specified name if it exists', function () {
      let channelService = new ChannelService(mockApp);
      channelService.createChannel(channelName);
      let channel = channelService.getChannel(channelName);
      should.exist(channel);
      channelName.should.equal(channel.name);
    });

    it('should return undefined if the channel dose not exist', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.getChannel(channelName);
      should.not.exist(channel);
    });

    it('should create and return a new channel if create parameter is set', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.getChannel(channelName, true);
      should.exist(channel);
      channelName.should.equal(channel.name);
    });
  });

  describe('#pushMessageByUids', function () {
    it('should push message to the right frontend server', function (done: MochaDone) {
      let sid1 = 'sid1', sid2 = 'sid2';
      let uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
      let orgRoute = 'test.route.string';
      let mockUids = [
        { sid: sid1, uid: uid1 },
        { sid: sid2, uid: uid2 },
        { sid: sid2, uid: uid3 }
      ];
      let mockMsg = { key: 'some remote message' };
      let uidMap: { [key: string]: any } = {};
      for (let i in mockUids) {
        uidMap[mockUids[i].uid] = mockUids[i];
      }

      let invokeCount = 0;

      let mockRpcInvoke = function (sid: string, rmsg: { [key: string]: any }, cb: Function) {
        invokeCount++;
        let args = rmsg.args;
        let route = args[0];
        let msg = args[1];
        let uids = args[2];
        mockMsg.should.eql(msg);

        for (let j = 0, l = uids.length; j < l; j++) {
          let uid = uids[j];
          let r2 = uidMap[uid];
          r2.sid.should.equal(sid);
        }

        cb();
      };

      let app = pinus.createApp({ base: mockBase });
      app.rpcInvoke = mockRpcInvoke;
      let channelService = new ChannelService(app);

      channelService.pushMessageByUids(orgRoute, mockMsg, mockUids, function () {
        invokeCount.should.equal(2);
        done();
      });
    });

    it('should return an err if uids is empty', function (done: MochaDone) {
      let mockMsg = { key: 'some remote message' };
      let app = pinus.createApp({ base: mockBase });
      let channelService = new ChannelService(app);

      channelService.pushMessageByUids(mockMsg, null, function (err: Error) {
        should.exist(err);
        err.message.should.equal('uids should not be empty');
        done();
      });
    });

    it('should return err if all message fail to push', function (done: MochaDone) {
      let sid1 = 'sid1', sid2 = 'sid2';
      let uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
      let mockUids = [
        { sid: sid1, uid: uid1 },
        { sid: sid2, uid: uid2 },
        { sid: sid2, uid: uid3 }
      ];
      let mockMsg = { key: 'some remote message' };
      let uidMap: { [key: string]: any } = {};
      for (let i in mockUids) {
        uidMap[mockUids[i].uid] = mockUids[i];
      }

      let invokeCount = 0;

      let mockRpcInvoke = function (sid: string, rmsg: { [key: string]: any }, cb: (parameter: Error) => void) {
        invokeCount++;
        cb(new Error('[TestMockError] mock rpc error'));
      };

      let app = pinus.createApp({ base: mockBase });
      app.rpcInvoke = mockRpcInvoke;
      let channelService = new ChannelService(app);

      channelService.pushMessageByUids(mockMsg, mockUids, function (err: Error) {
        invokeCount.should.equal(2);
        should.exist(err);
        err.message.should.equal('all uids push message fail');
        done();
      });
    });

    it('should return fail uid list if fail to push messge to some of the uids', function (done: MochaDone) {
      let sid1 = 'sid1', sid2 = 'sid2';
      let uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
      let mockUids = [{ sid: sid1, uid: uid1 }, { sid: sid2, uid: uid2 }, { sid: sid2, uid: uid3 }];
      let mockMsg = { key: 'some remote message' };
      let uidMap: { [key: string]: any } = {};
      for (let i in mockUids) {
        uidMap[mockUids[i].uid] = mockUids[i];
      }

      let invokeCount = 0;

      let mockRpcInvoke = function (sid: string, rmsg: { [key: string]: any }, cb: Function) {
        invokeCount++;
        if (rmsg.args[2].indexOf(uid1) >= 0) {
          cb(null, [uid1]);
        } else if (rmsg.args[2].indexOf(uid3) >= 0) {
          cb(null, [uid3]);
        } else {
          cb();
        }
      };

      let app = pinus.createApp({ base: mockBase });
      app.rpcInvoke = mockRpcInvoke;
      let channelService = new ChannelService(app);

      channelService.pushMessageByUids(mockMsg, mockUids, function (err: Error, fails: Array<any>) {
        invokeCount.should.equal(2);
        should.not.exist(err);
        should.exist(fails);
        fails.length.should.equal(2);
        fails.should.containEql(uid1);
        fails.should.containEql(uid3);
        done();
      });
    });
  });

  describe('#broadcast', function () {
    it('should push message to all specified frontend servers', function (done: MochaDone) {
      let mockServers = [
        { id: 'connector-1', serverType: 'connector', other: 'xxx1' },
        { id: 'connector-2', serverType: 'connector', other: 'xxx2' },
        { id: 'area-1', serverType: 'area', other: 'yyy1' },
        { id: 'gate-1', serverType: 'gate', other: 'zzz1' },
        { id: 'gate-2', serverType: 'gate', other: 'xxx1' },
        { id: 'gate-3', serverType: 'gate', other: 'yyy1' }
      ];
      let connectorIds = ['connector-1', 'connector-2'];
      let mockSType = 'connector';
      let mockRoute = 'test.route.string';
      let mockBinded = true;
      let opts = { binded: mockBinded };
      let mockMsg = { key: 'some remote message' };

      let invokeCount = 0;
      let sids: Array<number> = [];

      let mockRpcInvoke = function (sid: number, rmsg: { [key: string]: any }, cb: Function) {
        invokeCount++;
        let args = rmsg.args;
        let route = args[0];
        let msg = args[1];
        let opts = args[2];
        mockMsg.should.eql(msg);
        mockRoute.should.equal(route);
        should.exist(opts);
        mockBinded.should.equal(opts.userOptions.binded);
        sids.push(sid);
        cb();
      };

      let app = pinus.createApp({ base: mockBase });
      app.rpcInvoke = mockRpcInvoke;
      app.addServers(mockServers);
      let channelService = new ChannelService(app);

      channelService.broadcast(mockSType, mockRoute, mockMsg,
        opts, function () {
          invokeCount.should.equal(2);
          sids.length.should.equal(connectorIds.length);
          for (let i = 0, l = connectorIds.length; i < l; i++) {
            sids.should.containEql(connectorIds[i]);
          }
          done();
        });
    });
  });
});
