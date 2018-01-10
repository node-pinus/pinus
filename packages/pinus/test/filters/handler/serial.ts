import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let serialFilter = require('../../../lib/filters/handler/serial');
let FilterService = require('../../../lib/common/service/filterService');
let util = require('util');

let mockSession: { key: string, __serialTask__?: any } = {
  key: '123'
};

let WAIT_TIME = 100;
describe('#serialFilter', function () {
  it('should do before filter ok', function (done: MochaDone) {
    let service = new FilterService();
    let filter = serialFilter();
    service.before(filter);

    service.beforeFilter(null, mockSession, function () {
      should.exist(mockSession);

      should.exist(mockSession.__serialTask__);
      done();
    });
  });

  it('should do after filter by doing before filter ok', function (done: MochaDone) {
    let service = new FilterService();
    let filter = serialFilter();
    let _session: { key: string, __serialTask__?: any };
    service.before(filter);

    service.beforeFilter(null, mockSession, function () {
      should.exist(mockSession);
      should.exist(mockSession.__serialTask__);
      _session = mockSession;
    });

    service.after(filter);

    service.afterFilter(null, null, mockSession, null, function () {
      should.exist(mockSession);
      should.strictEqual(mockSession, _session);
    });

    setTimeout(done, WAIT_TIME);
  });
});