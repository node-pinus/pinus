let pinus = require('../lib/index');
import * as should from 'should';
let mockBase = process.cwd() + '/test';
// import { describe, it } from "mocha-typescript"

describe('pinus', function () {
  describe('#createApp', function () {
    it('should create and get app, be the same instance', function (done: MochaDone) {
      let app = pinus.createApp({ base: mockBase });
      should.exist(app);

      let app2 = pinus.app;
      should.exist(app2);
      should.strictEqual(app, app2);
      done();
    });
  });
});
