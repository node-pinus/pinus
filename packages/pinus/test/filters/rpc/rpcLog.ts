import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let rpcLogFilter = require('../../../lib/filters/rpc/rpcLog').RpcLogFilter;
rpcLogFilter = new rpcLogFilter()
let mockData = {
    serverId: 'connector-server-1',
    msg: 'hello',
    opts: {}
};

describe('#rpcLogFilter', function () {
    it('should do after filter by before filter', function (done: MochaDone) {
        rpcLogFilter.before(mockData.serverId, mockData.msg, mockData.opts, function () {
            rpcLogFilter.after(mockData.serverId, mockData.msg, mockData.opts, function (serverId: number, msg: string, opts: any) {
                should.exist((mockData.opts as any)['__start_time__']);
                done();
            });
        });
    });
});
