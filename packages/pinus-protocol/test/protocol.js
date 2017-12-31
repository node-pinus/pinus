var should = require('should');
var Protocol = require('../');
var Package = Protocol.Package;
var Message = Protocol.Message;

describe('Pomelo protocol test', function() {
  describe('String encode and decode', function() {
    it('should be ok to encode and decode Chinese string', function() {
      var str = '你好, abc~~~';
      var buf = Protocol.strencode(str);
      should.exist(buf);
      str.should.equal(Protocol.strdecode(buf));
    });
  });

  describe('Package encode and decode', function() {
    it('should keep the same data after encoding and decoding', function() {
      var msg = 'hello world~';
      var buf = Package.encode(Package.TYPE_DATA, Protocol.strencode(msg));
      should.exist(buf);
      var res = Package.decode(buf);
      should.exist(res);
      Package.TYPE_DATA.should.equal(res.type);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should ok when encoding and decoding package without body', function() {
      var buf = Package.encode(Package.TYPE_HANDSHAKE);
      should.exist(buf);
      var res = Package.decode(buf);
      should.exist(res);
      Package.TYPE_HANDSHAKE.should.equal(res.type);
      should.not.exist(res.body);
    });
  });

  describe('Message encode and decode', function() {
    it('should be ok for encoding and decoding request', function() {
      var id = 128;
      var compress = 0;
      var route = 'connector.entryHandler.entry';
      var msg = 'hello world~';
      var buf = Message.encode(id, Message.TYPE_REQUEST, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding empty route', function() {
      var id = 256;
      var compress = 0;
      var route = '';
      var msg = 'hello world~';
      var buf = Message.encode(id, Message.TYPE_REQUEST, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding null route', function() {
      var n = Math.floor(10000*Math.random());
      var id = 128 * n;
      var compress = 0;
      var route = null;
      var msg = 'hello world~';
      var buf = Message.encode(id, Message.TYPE_REQUEST, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      res.route.should.equal('');
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding compress route', function() {
      var id = 256;
      var compress = 1;
      var route = 3;
      var msg = 'hello world~';
      var buf = Message.encode(id, Message.TYPE_REQUEST, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);

      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding mutil-bytes id', function() {
      var id = Math.pow(2, 30);
      var compress = 1;
      var route = 3;
      var msg = 'hello world~';
      var buf = Message.encode(id, Message.TYPE_REQUEST, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);

      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding notify', function() {
      var compress = 0;
      var route = 'connector.entryHandler.entry';
      var msg = 'hello world~';
      var buf = Message.encode(0, Message.TYPE_NOTIFY, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      res.id.should.equal(0);
      Message.TYPE_NOTIFY.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding response', function() {
      var id = 1;
      var compress = 0;
      var msg = 'hello world~';
      var buf = Message.encode(id, Message.TYPE_RESPONSE, compress,
                               null, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_RESPONSE.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      should.not.exist(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding push', function() {
      var compress = 0;
      var route = 'connector.entryHandler.entry';
      var msg = 'hello world~';
      var buf = Message.encode(0, Message.TYPE_PUSH, compress,
                               route, Protocol.strencode(msg));
      should.exist(buf);
      var res = Message.decode(buf);
      should.exist(res);
      res.id.should.equal(0);
      Message.TYPE_PUSH.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

  });
});
