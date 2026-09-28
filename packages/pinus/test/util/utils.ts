let utils = require('../../lib/util/utils');
import  'should';
// import { describe, it } from "mocha-typescript"

describe('utils test', function () {
  describe('#invokeCallback', function () {
    it('should invoke the function with the parameters', function () {
      let p1 = 1, p2 = 'str';

      let func = function (arg1: number, arg2: string) {
        p1.should.equal(arg1);
        p2.should.equal(arg2);
      };

      utils.invokeCallback(func, p1, p2);
    });

    it('should ok if cb is null', function () {
      let p1 = 1, p2 = 'str';
      (function () {
        utils.invokeCallback(null, p1, p2);
      }).should.not.throw();
    });
  });

  describe('#size', function () {
    it('should return the own property count of the object', function () {
      let obj = {
        p1: 'str',
        p2: 1,
        m1: function () { }
      };

      utils.size(obj).should.equal(2);
    });
  });

  describe('#startsWith', function () {
    it('should return true if the string do start with the prefix', function () {
      let src = 'prefix with a string';
      let prefix = 'prefix';

      utils.startsWith(src, prefix).should.be.true;
    });

    it('should return false if the string not start with the prefix', function () {
      let src = 'prefix with a string';
      let prefix = 'prefix222';

      utils.startsWith(src, prefix).should.be.false;

      prefix = 'with';
      utils.startsWith(src, prefix).should.be.false;
    });

    it('should return false if the src not a string', function () {
      utils.startsWith(1, 'str').should.be.false;
    });
  });

  describe('#endsWith', function () {
    it('should return true if the string do end with the prefix', function () {
      let src = 'string with a suffix';
      let suffix = 'suffix';

      utils.endsWith(src, suffix).should.be.true;
    });

    it('should return false if the string not end with the prefix', function () {
      let src = 'string with a suffix';
      let suffix = 'suffix222';

      utils.endsWith(src, suffix).should.be.false;

      suffix = 'with';
      utils.endsWith(src, suffix).should.be.false;
    });

    it('should return false if the src not a string', function () {
      utils.endsWith(1, 'str').should.be.false;
    });
  });

  describe('#hasChineseChar', function () {
    it('should return false if the string does not have any Chinese characters', function () {
      let src = 'string without Chinese characters';
      utils.hasChineseChar(src).should.be.false;
    });

    it('should return true if the string has Chinese characters', function () {
      let src = 'string with Chinese characters 你好';
      utils.hasChineseChar(src).should.be.true;
    });
  });

  describe('#unicodeToUtf8', function () {
    it('should return the origin string if the string does not have any Chinese characters', function () {
      let src = 'string without Chinese characters';
      utils.unicodeToUtf8(src).should.equal(src);
    });

    it('should not return the origin string if the string has Chinese characters', function () {
      let src = 'string with Chinese characters 你好';
      utils.unicodeToUtf8(src).should.not.equal(src);
    });
  });

  describe('#isLocal', function () {
    it('should return true if the ip is local', function () {
      let ip = '127.0.0.1';
      let host = 'localhost';
      let other = '192.168.1.1';
      utils.isLocal(ip).should.be.true;
      utils.isLocal(host).should.be.true;
      utils.isLocal(other).should.be.false;
    });
  });

  describe('#loadCluster', function () {
    it('should produce cluster servers', function () {
      let clusterServer = { host: '127.0.0.1', port: '3010++', serverType: 'chat', cluster: true, clusterCount: 2 };
      let serverMap = {};
      let app = { clusterSeq: {} };
      utils.loadCluster(app, clusterServer, serverMap);
      utils.size(serverMap).should.equal(2);
    });
  });

  describe('#arrayDiff', function () {
    it('should return the difference of two arrays', function () {
      let array1 = [1, 2, 3, 4, 5];
      let array2 = [1, 2, 3];
      let array = utils.arrayDiff(array1, array2);
      array.should.eql([4, 5]);
    });
  });

  describe('#extends', function () {
    it('should extends opts', function () {
      let opts = {
        test: 123
      };
      let add = {
        aaa: 555
      };
      let result = utils.extendsObject(opts, add);
      result.should.eql({
        test: 123,
        aaa: 555
      });
    });
  });

  describe('#ping', function () {
    it('should ping server', function () {
      utils.ping('127.0.0.1', function (flag: boolean) {
        flag.should.be.true;
      });
      utils.ping('111.111.111.111', function (flag: boolean) {
        flag.should.be.false;
      });
    });
  });

  describe('#getBusyAddresses', function () {
    it('should not treat a longer port as a match', function () {
      // 回归：49992 里含有 9992，旧的 grep 子串匹配会把它算成命中
      let output = ':::39992\n0.0.0.0:9990\n127.0.0.1:49992\n';
      utils.getBusyAddresses(output, 9992).should.eql([]);
      utils.getBusyAddresses(output, 9990).should.eql(['0.0.0.0:9990']);
      utils.getBusyAddresses(output, 39992).should.eql([':::39992']);
    });

    it('should match the exact port of ipv4 / ipv6 / wildcard address', function () {
      utils.getBusyAddresses('0.0.0.0:9992', 9992).should.eql(['0.0.0.0:9992']);
      utils.getBusyAddresses(':::9992', 9992).should.eql([':::9992']);
      utils.getBusyAddresses('*:9992', 9992).should.eql(['*:9992']);
    });

    it('should match BSD netstat style address which separates port by dot', function () {
      utils.getBusyAddresses('127.0.0.1.9992', 9992).should.eql(['127.0.0.1.9992']);
    });

    it('should ignore address without port and blank lines', function () {
      utils.getBusyAddresses('0.0.0.0:*\n\n   \n*:*\n', 9992).should.eql([]);
    });

    it('should accept port as string', function () {
      // console#parseArgs 把 key=value 都当字符串，pinus add 走的就是这条路
      utils.getBusyAddresses('0.0.0.0:9992\n', '9992').should.eql(['0.0.0.0:9992']);
    });

    it('should tolerate empty output', function () {
      utils.getBusyAddresses('', 9992).should.eql([]);
      utils.getBusyAddresses(undefined, 9992).should.eql([]);
    });
  });

  describe('#formatPortOccupiedMessage', function () {
    it('should keep the origin message if detail is absent', function () {
      utils.formatPortOccupiedMessage().should.equal('Port occupied already, check your server to add.');
    });

    it('should tell which address occupied the port', function () {
      let detail = { host: '127.0.0.1', port: 9992, addresses: ['0.0.0.0:9992', '127.0.0.1.9992'] };
      utils.formatPortOccupiedMessage(detail).should.equal(
        'Port occupied already(0.0.0.0:9992,127.0.0.1.9992 on 127.0.0.1), check your server to add.');
    });
  });

});
