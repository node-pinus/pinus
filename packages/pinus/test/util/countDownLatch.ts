let CountDownLatch = require('../../lib/util/countDownLatch');
import * as should from 'should';
// import { describe, it } from "mocha-typescript"

let cbCreator = (function () {
  let count = 0;

  return {
    callback: function () {
      count++;
    },
    getCount: function () {
      return count;
    },
    count: count
  };
})();

describe('countdown latch test', function () {
  let countDownLatch1;
  let countDownLatch2;

  describe('#count down', function () {
    it('should invoke the callback after the done method was invoked the specified times', function (done: MochaDone) {
      let n = 3, doneCount = 0;
      let cdl = CountDownLatch.createCountDownLatch(n, function () {
        doneCount.should.equal(n);
        done();
      });

      for (let i = 0; i < n; i++) {
        doneCount++;
        cdl.done();
      }
    });

    it('should throw exception if pass a negative or zero to the create method', function () {
      (function () {
        CountDownLatch.createCountDownLatch(-1, function () { });
      }).should.throw();

      (function () {
        CountDownLatch.createCountDownLatch(0, function () { });
      }).should.throw();
    });

    it('should throw exception if pass illegal cb to the create method', function () {
      (function () {
        CountDownLatch.createCountDownLatch(1, null);
      }).should.throw();
    });

    it('should throw exception if try to invoke done metho of a latch that has fired cb', function () {
      let n = 3;
      let cdl = CountDownLatch.createCountDownLatch(n, function () { });

      for (let i = 0; i < n; i++) {
        cdl.done();
      }

      (function () {
        cdl.done();
      }).should.throw();
    });

    it('should invoke the callback if timeout', function () {
      let n = 3;
      let cdl = CountDownLatch.createCountDownLatch(n, { timeout: 3000 }, function (isTimeout: boolean) {
        isTimeout.should.equal(true);
      });

      for (let i = 0; i < n - 1; i++) {
        cdl.done();
      }
    });

  });
});
