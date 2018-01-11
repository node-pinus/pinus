import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let toobusyFilter = require('../../../lib/filters/rpc/toobusy');

let mockData = {
  serverId: 'connector-server-1',
  msg: 'hello',
  opts: {}
};


describe('#toobusyFilter', function () {
  it('should no callback for toobusy', function (done: MochaDone) {
    function load() {
      let callbackInvoked = false;
      toobusyFilter.before(mockData.serverId, mockData.msg, mockData.opts, function (serverId: number, msg: string, opts: any) {
        callbackInvoked = true;
      });

      if (!callbackInvoked) {
        console.log(' logic of toobusy enterd, done!');
        return done();
      }
      let start = Date.now();
      while ((Date.now() - start) < 250) {
        for (let i = 0; i < 1e5; ) i++;
      }
      setTimeout(load, 0);
    }
    load();
  });
});
