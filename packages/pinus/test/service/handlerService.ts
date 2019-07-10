import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let HandlerService = require('../../lib/common/service/handlerService').HandlerService;
import { Session } from '../../lib/common/service/sessionService';

class MockApp {
    serverType: string = 'connector';

    constructor() {
    }

    usedPlugins: any = [];

    get(this: any, key: string) {
        return this[key];
    }

    getCurrentServer() {
        return {}
    }
}

let mockApp = new MockApp();

let mockSession = {
    exportSession: function () {
        return this;
    }
};

let mockMsg = { key: 'some request message' };
let mockRouteRecord = { serverType: 'connector', handler: 'testHandler', method: 'testMethod' };

describe('handler service test', function () {
    describe('handle', function () {
        it('should dispatch the request to the handler if the route match current server type', function (done: MochaDone) {
            let invoke1Count = 0, invoke2Count = 0;
            // mock datas
            let mockHandlers = {
                testHandler: {
                    testMethod: async function (msg: any, session: Session, next: Function) {
                        invoke1Count++;
                        msg.should.eql(mockMsg);
                    }
                },
                test2Handler: {
                    testMethod: async function (msg: any, session: Session, next: Function) {
                        invoke2Count++;
                    }
                }
            };

            let mockOpts = {};

            let service = new HandlerService(mockApp, mockOpts);
            service.handlerMap = { connector: mockHandlers };

            service.handle(mockRouteRecord, mockMsg, mockSession, function () {
                invoke1Count.should.equal(1);
                invoke2Count.should.equal(0);
                done();
            });
        });

        it('should return an error if can not find the appropriate handler locally', function (done: MochaDone) {
            let mockHandlers = {};
            let mockOpts = {};
            let service = new HandlerService(mockApp, mockOpts);
            service.handlerMap = { connector: mockHandlers };

            service.handle(mockRouteRecord, mockMsg, mockSession, function (err: Error) {
                should.exist(err);
                done();
            });
        });
    });
});
