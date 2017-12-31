var lib = process.env.POMELO_RPC_COV ? 'lib-cov' : 'lib';
var should = require('should');
var Proxy = require('../../' + lib + '/util/proxy');

var A = function(value) {
  this.value = value;
};
A.prototype.add = function(num) {
  this.value += num;
};
A.prototype.sub = function(num) {
  this.value -= num;
};
A.prototype.addB = function() {
  this.b.value++;
};
A.prototype.addInternal = function() {
  this.add(1);
};

var B = function(value){
  this.value = value;
};
B.prototype.addA = function() {
  this.a.value++;
};

var callback = function(service, method, args, attach, invoke) {

};

describe('proxy', function() {
  describe('#create', function() {
    it('should invoke the proxy function if it had been set', function() {
      var callbackCount = 0;
      var cb = function(service, method, args, attach, invoke) {
        callbackCount++;
      };
      var a = new A(1);

      var proxy = Proxy.create({
        service: 'A',
        origin: a,
        proxyCB: cb
      });
      proxy.add(1);
      callbackCount.should.equal(1);
    });

    it('should invoke the origin function if the proxy function not set', function() {
      var value = 1;
      var a = new A(value);

      var proxy = Proxy.create({
        origin: a
      });
      proxy.add(1);
      a.value.should.equal(value + 1);
    });

    it('should invoke the origin function if the invoke callback had been called in proxy function', function() {
      var callbackCount = 0;
      var originCallCount = 0;
      var value = 1;

      var cb = function(namespace, method, args, attach, invoke) {
        callbackCount++;
        invoke(args);
      };
      var a = new A(value);
      a.add = function(num) {
        originCallCount++;
        this.value += num;
      };

      //overwrite the origin function
      var proxy = Proxy.create({
        origin: a,
        proxyCB: cb
      });
      proxy.add(1);

      callbackCount.should.equal(1);
      originCallCount.should.equal(1);
      a.value.should.equal(value + 1);
    });

    it('should not invoke the origin function if the invoke callback not called', function() {
      var callbackCount = 0;
      var originCallCount = 0;
      var value = 1;

      var cb = function(namespace, method, args, attach, invoke) {
        callbackCount++;
      };
      var a = new A(value);
      //overwrite the origin function
      a.add = function(num) {
        originCallCount++;
        this.value += this.value;
      };

      var proxy = Proxy.create({
        origin: a,
        proxyCB: cb
      });
      proxy.add(1);

      callbackCount.should.equal(1);
      originCallCount.should.equal(0);
      a.value.should.equal(value);
    });

    it('should flush the operation result on fields to the origin object', function() {
      var value = 1;

      var a = new A(value);
      var proxy = Proxy.create({
        origin: a
      });

      proxy.value++;

      proxy.value.should.equal(value+ 1);
      a.value.should.equal(value + 1);
    });

    it('should be ok if create proxies for two objects that references each other', function() {
      var callbackCount = 0;
      var valueA = 1;
      var valueB = 2;

      var cb = function(namespace, method, args, attach, invoke) {
        callbackCount++;
        invoke(args);
      };
      var a = new A(valueA);
      var b = new B(valueB);

      var proxyA = Proxy.create({
        origin: a,
        proxyCB: cb
      });
      var proxyB = Proxy.create({
        origin: b,
        proxyCB: cb
      });
      a.b = b;
      b.a = a;
      proxyA.addB();
      proxyB.addA();

      callbackCount.should.equal(2);
      a.value.should.equal(valueA + 1);
      b.value.should.equal(valueB + 1);
    });

    it('should not proxy the internal invoking', function() {
      var callbackCount = 0;
      var value = 1;

      var cb = function(namespace, method, args, attach, invoke) {
        callbackCount++;
        invoke(args);
      };
      var a = new A(value);

      var proxy = Proxy.create({
        origin: a,
        proxyCB: cb
      });
      proxy.addInternal(1);

      callbackCount.should.equal(1);
      a.value.should.equal(value + 1);
    });

    it('should has the same class info with origin object', function() {
      var a = new A(1);

      var proxy = Proxy.create({
        origin: a
      });

      proxy.should.be.an.instanceof(A);
    });

    it('should pass the attach from opts to invoke callback', function() {
      var callbackCount = 0;
      var expectAttach = {someValue: 1, someObject: {}, someStr: "hello"};

      var cb = function(namespace, method, args, attach, invoke) {
        callbackCount++;
        should.exist(attach);
        attach.should.equal(expectAttach);
      };
      var a = new A(1);

      var proxy = Proxy.create({
        origin: a,
        proxyCB: cb,
        attach: expectAttach
      });
      proxy.addInternal(1);

      callbackCount.should.equal(1);
    });
  });
});