let DEFAULT_PREFIX = 'PINUS:CHANNEL';
let utils = require('../../lib/util/utils');
import { ChannelServiceOptions } from '../../lib/common/service/channelService';
import { Application } from '../../lib/application';

class MockManager {
  app: Application;
  opts: ChannelServiceOptions;
  prefix: string;
  usersMap: any;
  constructor(app: Application, opts: ChannelServiceOptions) {
    this.app = app;
    this.opts = opts || {};
    this.prefix = opts.prefix || DEFAULT_PREFIX;
  }

  start(cb: Function) {
    this.usersMap = {};
    utils.invokeCallback(cb);
  }

  stop(force: boolean, cb: Function) {
    this.usersMap = null;
    utils.invokeCallback(cb);
  }

  add(name: string, uid: string, sid: string, cb: Function) {
    let key = genKey(this, name, sid);
    if (!this.usersMap[key]) {
      this.usersMap[key] = [];
    }
    this.usersMap[key].push(uid);
    utils.invokeCallback(cb);
  }

  leave(name: string, uid: string, sid: string, cb: Function) {
    let key = genKey(this, name, sid);
    let res = deleteFrom(uid, this.usersMap[key]);
    if (this.usersMap[key] && this.usersMap[key].length === 0) {
      delete this.usersMap[sid];
    }
    utils.invokeCallback(cb);
  }

  getMembersBySid(name: string, sid: string, cb: Function) {
    let key = genKey(this, name, sid);
    if (!this.usersMap[key])
      this.usersMap[key] = [];
    utils.invokeCallback(cb, null, this.usersMap[key]);
  }

  destroyChannel(name: string, cb: Function) {
    let servers = this.app.getServers();
    let server, removes = [];
    for (let sid in servers) {
      server = servers[sid];
      if (this.app.isFrontend(server)) {
        removes.push(genKey(this, name, sid));
      }
    }

    if (removes.length === 0) {
      utils.invokeCallback(cb);
      return;
    }

    for (let i = 0; i < removes.length; i++) {
      delete this.usersMap[removes[i]];
    }
    utils.invokeCallback(cb);
  }
}

let genKey = function (self: MockManager, name: string, sid: string) {
  return self.prefix + ':' + name + ':' + sid;
};

let deleteFrom = function (uid: string, group: Array<string>) {
  if (!group) {
    return true;
  }

  for (let i = 0, l = group.length; i < l; i++) {
    if (group[i] === uid) {
      group.splice(i, 1);
      return true;
    }
  }
  return false;
};

export { MockManager };