var pinus = require('../');
var should = require('should');
var mockBase = process.cwd() + '/test';

describe('pinus', function() {
  describe('#createApp', function() {
    it('should create and get app, be the same instance', function(done) {
      var app = pinus.createApp({base: mockBase});
      should.exist(app);

      var app2 = pinus.app;
      should.exist(app2);
      should.strictEqual(app, app2);
      done();
    });
  });
});
