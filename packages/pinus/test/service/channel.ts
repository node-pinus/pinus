import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let pinus = require('../../lib/index');
let ChannelService = require('../../lib/common/service/channelService');

let mockBase = process.cwd() + '/test';
let channelName = 'test_channel';
let mockApp = { serverId: 'test-server-1' };

describe('channel test', function () {
  describe('#add', function () {
    it('should add a member into channel and could fetch it later', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);

      let uid = 'uid1', sid = 'sid1';
      channel.add(uid, sid).should.be.true;

      let member = channel.getMember(uid);
      should.exist(member);
      uid.should.equal(member.uid);
      sid.should.equal(member.sid);
    });

    it('should fail if the sid not specified', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);

      let uid = 'uid1';
      channel.add(uid, null).should.be.false;
    });

    it('should fail after the channel has been destroied', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);

      channel.destroy();

      let uid = 'uid1', sid = 'sid1';
      channel.add(uid, sid).should.be.false;
    });
  });

  describe('#leave', function () {
    it('should remove the member from channel when leave', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);

      let uid = 'uid1', sid = 'sid1';
      channel.add(uid, sid).should.be.true;

      let member = channel.getMember(uid);
      should.exist(member);

      channel.leave(uid, sid);
      member = channel.getMember(uid);
      should.not.exist(member);
    });

    it('should fail if uid or sid not specified', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);

      let uid = 'uid1', sid = 'sid1';
      channel.add(uid, sid).should.be.true;

      channel.leave(uid, null).should.be.false;
      channel.leave(null, sid).should.be.false;
    });
  });

  describe('#getMembers', function () {
    it('should return all the members of channel', function () {
      let uinfos = [
        { uid: 'uid1', sid: 'sid1' },
        { uid: 'uid2', sid: 'sid2' },
        { uid: 'uid3', sid: 'sid3' }
      ];

      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);

      let i, l, item;
      for (i = 0, l = uinfos.length; i < l; i++) {
        item = uinfos[i];
        channel.add(item.uid, item.sid);
      }

      let members = channel.getMembers();
      should.exist(members);
      members.length.should.equal(uinfos.length);
      for (i = 0, l = uinfos.length; i < l; i++) {
        item = uinfos[i];
        members.should.include(item.uid);
      }
    });
  });

  describe('#pushMessage', function () {
    it('should push message to the right frontend server by sid', function (done: MochaDone) {
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

      let channel = channelService.createChannel(channelName);
      for (let i = 0, l = mockUids.length; i < l; i++) {
        channel.add(mockUids[i].uid, mockUids[i].sid);
      }

      channel.pushMessage(mockMsg, function () {
        invokeCount.should.equal(2);
        done();
      });
    });
    it('should fail if channel has destroied', function () {
      let channelService = new ChannelService(mockApp);
      let channel = channelService.createChannel(channelName);
      should.exist(channel);

      channel.destroy();

      channel.pushMessage({}, function (err: Error) {
        should.exist(err);
        err.message.should.equal('channel is not running now');
      });
    });
  });
});