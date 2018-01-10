import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let toobusyFilter = require('../../../lib/filters/handler/toobusy');
let FilterService = require('../../../lib/common/service/filterService');
let util = require('util');
let mockSession = {
  key: '123'
};

describe('#toobusyFilter', function () {
  it('should do before filter ok', function (done: MochaDone) {
    let service = new FilterService();
    let filter = toobusyFilter();
    service.before(filter);

    service.beforeFilter(null, mockSession, function (err: Error) {
      should.not.exist(err);
      should.exist(mockSession);
      done();
    });
  });

  it('should do before filter error because of too busy', function (done: MochaDone) {
    let service = new FilterService();
    let filter = toobusyFilter();
    service.before(filter);

    let exit = false;
    function load() {
      service.beforeFilter(null, mockSession, function (err: Error, resp: any) {
        should.exist(mockSession);
        console.log('err: ' + err);
        if (!!err) {
          exit = true;
        }
      });

      console.log('exit: ' + exit);
      if (exit) {
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
