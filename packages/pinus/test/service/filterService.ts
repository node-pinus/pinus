import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let FilterService = require('../../lib/common/service/filterService');
import { FrontendOrBackendSession } from '../../lib/server/server';

let WAIT_TIME = 50;

let mockFilter1 = {
  before: function (msg: any, session: FrontendOrBackendSession & { beforeCount1: number }, cb: Function) {
    session.beforeCount1++;
    cb();
  },

  after: function (err: Error, msg: any, session: FrontendOrBackendSession & { afterCount1: number }, resp: any, cb: Function) {
    session.afterCount1++;
    cb();
  }
};

let mockFilter2 = {
  before: function (msg: any, session: FrontendOrBackendSession & { beforeCount2: number }, cb: Function) {
    session.beforeCount2++;
    cb();
  },

  after: function (err: Error, msg: any, session: FrontendOrBackendSession & { afterCount2: number }, resp: any, cb: Function) {
    session.afterCount2++;
    cb();
  }
};

let blackholdFilter = {
  before: function () { },
  after: function () { }
};

class MockSession {
  beforeCount1: number = 0;
  afterCount1: number = 0;
  beforeCount2: number = 0;
  afterCount2: number = 0;
  constructor() {

  }
}

describe('filter service test', function () {
  describe('#filter', function () {
    it('should register before filter by calling before method and fire filter chain by calling beforeFilter', function (done: MochaDone) {
      let session = new MockSession();
      let service = new FilterService();
      service.before(mockFilter1);
      service.before(mockFilter2);
      service.beforeFilter(null, session, function () {
        should.exist(session);
        session.beforeCount1.should.equal(1);
        session.beforeCount2.should.equal(1);
        session.afterCount1.should.equal(0);
        session.afterCount2.should.equal(0);
        done();
      });
    });

    it('should register after filter by calling after method and fire filter chain by calling afterFilter', function (done: MochaDone) {
      let session = new MockSession();
      let service = new FilterService();
      service.after(mockFilter1);
      service.after(mockFilter2);
      service.afterFilter(null, null, session, null, function () {
        should.exist(session);
        session.beforeCount1.should.equal(0);
        session.beforeCount2.should.equal(0);
        session.afterCount1.should.equal(1);
        session.afterCount2.should.equal(1);
        done();
      });
    });

    it('should be ok if filter is a function', function (done: MochaDone) {
      let session = { beforeCount: 0, afterCount: 0 };
      let service = new FilterService();
      let beforeCount = 0, afterCount = 0;

      service.before(function (msg: any, session: FrontendOrBackendSession & { beforeCount: number }, cb: Function) {
        session.beforeCount++;
        cb();
      });
      service.after(function (err: Error, msg: any, session: FrontendOrBackendSession & { afterCount: number }, resp: any, cb: Function) {
        session.afterCount++;
        cb();
      });
      service.beforeFilter(null, session, function () {
        beforeCount++;
      });
      service.afterFilter(null, null, session, null, function () {
        afterCount++;
      });

      setTimeout(function () {
        session.beforeCount.should.equal(1);
        session.afterCount.should.equal(1);
        beforeCount.should.equal(1);
        afterCount.should.equal(1);

        done();
      }, WAIT_TIME);
    });

    it('should not invoke the callback if filter not invoke callback', function (done: MochaDone) {
      let session = new MockSession();
      let service = new FilterService();
      let beforeCount = 0, afterCount = 0;

      service.before(blackholdFilter);
      service.after(blackholdFilter);
      service.beforeFilter(null, session, function () {
        beforeCount++;
      });
      service.afterFilter(null, null, session, null, function () {
        afterCount++;
      });

      setTimeout(function () {
        session.beforeCount1.should.equal(0);
        session.beforeCount2.should.equal(0);
        session.afterCount1.should.equal(0);
        session.afterCount2.should.equal(0);
        beforeCount.should.equal(0);
        afterCount.should.equal(0);

        done();
      }, WAIT_TIME);
    });

    it('should pass the err and resp parameters to callback and ignore the filters behind if them specified in before filter', function (done: MochaDone) {
      let session = new MockSession();
      let service = new FilterService();
      let error = 'some error message';
      let response = { key: 'some value' };
      let respFilter = {
        before: function (msg: any, session: FrontendOrBackendSession, cb: Function) {
          cb(error, response);
        }
      };

      service.before(mockFilter1);
      service.before(respFilter);
      service.before(mockFilter2);
      service.beforeFilter(null, session, function (err: Error, resp: any) {
        should.exist(err);
        err.should.equal(error);
        should.exist(resp);
        resp.should.equal(response);

        session.beforeCount1.should.equal(1);
        session.beforeCount2.should.equal(0);
        session.afterCount1.should.equal(0);
        session.afterCount2.should.equal(0);

        done();
      });
    });
  });
});