let pomelo = require('../');
import * as should from "should"
let mockBase = process.cwd() + '/test';
import {describe, it} from "mocha-typescript"

describe('pomelo', function() {
  describe('#createApp', function() {
    it('should create and get app, be the same instance', function(done: MochaDone) {
      let app = pomelo.createApp({base: mockBase});
      should.exist(app);

      let app2 = pomelo.app;
      should.exist(app2);
      should.strictEqual(app, app2);
      done();
    });
  });
});
