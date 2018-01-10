let pathUtil = require('../../lib/util/pathUtil');
let utils = require('../../lib/util/utils');
import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let fs = require('fs');

let mockBase = process.cwd() + '/test/mock-base';

describe('path util test', function () {
  describe('#getSysRemotePath', function () {
    it('should return the system remote service path for frontend server', function () {
      let role = 'frontend';
      let expectSuffix = '/common/remote/frontend';
      let p = pathUtil.getSysRemotePath(role);
      should.exist(p);
      fs.existsSync(p).should.be.true;
      utils.endsWith(p, expectSuffix).should.be.true;
    });

    it('should return the system remote service path for backend server', function () {
      let role = 'backend';
      let expectSuffix = '/common/remote/backend';
      let p = pathUtil.getSysRemotePath(role);
      should.exist(p);
      fs.existsSync(p).should.be.true;
      utils.endsWith(p, expectSuffix).should.be.true;
    });

  });

  describe('#getUserRemotePath', function () {
    it('should return user remote service path for the associated server type', function () {
      let serverType = 'connector';
      let expectSuffix = '/app/servers/connector/remote';
      let p = pathUtil.getUserRemotePath(mockBase, serverType);
      should.exist(p);
      fs.existsSync(p).should.be.true;
      utils.endsWith(p, expectSuffix).should.be.true;
    });

    it('should return null if the directory not exist', function () {
      let serverType = 'area';
      let p = pathUtil.getUserRemotePath(mockBase, serverType);
      should.not.exist(p);

      serverType = 'some-dir-not-exist';
      p = pathUtil.getUserRemotePath(mockBase, serverType);
      should.not.exist(p);
    });
  });

  describe('#listUserRemoteDir', function () {
    it('should return sub-direcotry name list of servers/ directory', function () {
      let expectNames = ['connector', 'area'];
      let p = pathUtil.listUserRemoteDir(mockBase);
      should.exist(p);
      expectNames.length.should.equal(p.length);
      for (let i = 0, l = expectNames.length; i < l; i++) {
        p.should.include(expectNames[i]);
      }
    });

    it('should throw err if the servers/ illegal', function () {
      (function () {
        pathUtil.listUserRemoteDir('some illegal base');
      }).should.throw();
    });
  });

  describe('#remotePathRecord', function () {
    let namespace = 'user';
    let serverType = 'connector';
    let path = '/some/path/to/remote';
    let r = pathUtil.remotePathRecord(namespace, serverType, path);
    should.exist(r);
    namespace.should.equal(r.namespace);
    serverType.should.equal(r.serverType);
    path.should.equal(r.path);
  });

  describe('#getHandlerPath', function () {
    it('should return user handler path for the associated server type', function () {
      let serverType = 'connector';
      let expectSuffix = '/app/servers/connector/handler';
      let p = pathUtil.getHandlerPath(mockBase, serverType);
      should.exist(p);
      fs.existsSync(p).should.be.true;
      utils.endsWith(p, expectSuffix).should.be.true;
    });

    it('should return null if the directory not exist', function () {
      let serverType = 'area';
      let p = pathUtil.getHandlerPath(mockBase, serverType);
      should.not.exist(p);

      serverType = 'some-dir-not-exist';
      p = pathUtil.getHandlerPath(mockBase, serverType);
      should.not.exist(p);
    });
  });

  describe('#getScriptPath', function () {
    let p = pathUtil.getScriptPath(mockBase);
    let expectSuffix = '/scripts';
    should.exist(p);
    utils.endsWith(p, expectSuffix).should.be.true;
  });

  describe('#getLogPath', function () {
    let p = pathUtil.getLogPath(mockBase);
    let expectSuffix = '/logs';
    should.exist(p);
    utils.endsWith(p, expectSuffix).should.be.true;
  });

});