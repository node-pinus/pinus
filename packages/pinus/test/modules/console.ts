import * as should from 'should';
// import { describe, it } from "mocha-typescript"
let pinus = require('../../lib/index');
let consoleModule = require('../../lib/modules/console');

declare let before: Function, after: Function;
describe('console module test', function () {
    describe('#monitorHandler', function () {
        it('should execute the corresponding command with different signals', function () {
            let flag: boolean;
            let rs: Array<any>;
            let opts: any = {
                app: {
                    components: {
                        __connector__: {
                            blacklist: []
                        }
                    },
                    stop: function (value: boolean) {
                        flag = value;
                    },
                    addCrons: function (array: Array<any>) {
                        rs = array;
                    },
                    removeCrons: function (array: Array<any>) {
                        rs = array;
                    },
                    isFrontend: function () {
                        return true;
                    }
                }
            };
            let module = new consoleModule(opts);
            let agent1 = {
                type: 'area'
            };
            let msg1 = { signal: 'stop' };
            module.monitorHandler(agent1, msg1);
            flag.should.eql(true);

            let msg2 = { signal: 'list' };
            let agent2 = {
                type: 'chat',
                id: 'chat-server-1'
            };
            module.monitorHandler(agent2, msg2, function (obj: { serverId: string, body: any }) {
                obj.serverId.should.eql('chat-server-1');
                obj.body.serverType.should.eql('chat');
            });

            let msg3 = { signal: 'addCron' };
            module.monitorHandler(agent2, msg3, null);
            rs.length.should.eql(1);

            let msg4 = { signal: 'removeCron' };
            module.monitorHandler(agent2, msg4, null);
            rs.length.should.eql(1);

            let msg5 = { signal: 'blacklist', blacklist: ['127.0.0.1'] };
            module.monitorHandler(agent1, msg5, null);
            opts.app.components.__connector__.blacklist.length.should.eql(1);


        });
    });

    describe('#clientHandler', function () {
        let _exit: any;
        let _setTimeout: any;
        let __setTimeout: any;
        let exitCount = 0;

        before(function (done: Function) {
            _exit = process.exit;
            _setTimeout = __setTimeout;
            done();
        });

        after(function (done: Function) {
            process.exit = _exit;
            __setTimeout = _setTimeout;
            done();
        });

        let opts = {
            app: {
                clusterSeq: {},
                stop: function (value: string) {
                    return value;
                },
                getServerById: function () {
                    return {
                        host: '127.0.0.1'
                    };
                },
                getServers: function () {
                    return {
                        'chat-server-1': {

                        }
                    };
                },
                get: function (value: string) {
                    switch (value) {
                        case 'main':
                            return __dirname + '/../../index.js';
                        case 'env':
                            return 'dev';
                    }
                },
                set: function (value: string) {
                    return value;
                },
                getServersByType: function () {
                    return [{ id: 'chat-server-1' }];
                }
            }
        };
        let module = new consoleModule(opts);
        it('should execute kill command', function (done: MochaDone) {
            let msg = { signal: 'kill' };
            process.exit = <never>function () { exitCount++; };
            __setTimeout = function (cb: Function, timeout: number) {
                if (timeout > 3000) {
                    timeout = 3000;
                }
                _setTimeout(cb, timeout);
            };

            let agent1 = {
                request: function (recordId: string, moduleId: string, msg: any, cb: (err?: Error | string, msg?: any) => void) {
                    cb('chat-server-1');
                },
                idMap: {
                    'chat-server-1': {
                        type: 'chat',
                        id: 'chat-server-1'
                    }
                }
            };
            module.clientHandler(agent1, msg, function (err: Error, result: { code: string }) {
                should.not.exist(err);
                should.exist(result.code);
            });

            let agent2 = {
                request: function (recordId: string, moduleId: string, msg: any, cb: (err?: Error | string, msg?: any) => void) {
                    cb(null);
                },
                idMap: {
                    'chat-server-1': {
                        type: 'chat',
                        id: 'chat-server-1'
                    }
                }
            };
            module.clientHandler(agent2, msg, function (err: Error, result: { code: string, status: any }) {
                should.not.exist(err);
                should.exist(result.code);
                result.code.should.eql('remained');
                done();
            });
        });

        it('should execute stop command', function (done: MochaDone) {
            let msg1 = { signal: 'stop', ids: ['chat-server-1'] };
            let msg2 = { signal: 'stop', ids: <any>[] };
            let agent = {
                notifyById: function (serverId: string, moduleId: string, msg: any) {

                },
                notifyAll: function (moduleId: string, msg: any) {

                }
            };
            module.clientHandler(agent, msg1, function (err: Error, result: { code: string, status: any }) {
                result.status.should.eql('part');
            });

            module.clientHandler(agent, msg2, function (err: Error, result: { code: string, status: any }) {
                result.status.should.eql('all');
                done();
            });
        });

        it('should execute list command', function () {
            let msg = { signal: 'list' };
            let agent = {
                request: function (recordId: string, moduleId: string, msg: any, cb: (obj: { serverId?: string, body?: any }) => void) {
                    cb({ serverId: 'chat-server-1', body: { 'server': {} } });
                },
                idMap: {
                    'chat-server-1': {
                        type: 'chat',
                        id: 'chat-server-1'
                    }
                }
            };
            module.clientHandler(agent, msg, function (err: Error, result: { msg: any }) {
                should.exist(result.msg);
            });
        });

        it('should execute add command', function () {
            let msg1 = { signal: 'add', args: ['host=127.0.0.1', 'port=88888', 'clusterCount=2'] };
            let msg2 = { signal: 'add', args: ['host=127.0.0.1', 'port=88888', 'id=chat-server-1', 'serverType=chat'] };
            let agent = {};
            module.clientHandler(agent, msg1, function (err: Error, result: any) {
                should.not.exist(err);
                result.length.should.eql(0);
            });
            module.clientHandler(agent, msg2, function (err: Error, result: { status: string }) {
                result.status.should.eql('ok');
            });
        });

        it('should execute blacklist command', function () {
            let msg1 = { signal: 'blacklist', args: ['127.0.0.1'] };
            let msg2 = { signal: 'blacklist', args: ['abc'] };
            let agent = {
                notifyAll: function (moduleId: string, msg: any) {

                }
            };
            module.clientHandler(agent, msg1, function (err: Error, result: { status: string }) {
                result.status.should.eql('ok');
            });
            module.clientHandler(agent, msg2, function (err: Error, result: any) {
                should.exist(err);
            });
        });

        it('should execute restart command', function () {
            let msg1 = { signal: 'restart', ids: ['chat-server-1'] };
            let msg2 = { signal: 'restart', type: 'chat', ids: <any>[] };
            let agent = {
                request: function (recordId: string, moduleId: string, msg: any, cb: (err?: Error | string, msg?: any) => void) {
                    cb(null);
                }
            };
            module.clientHandler(agent, msg1, function (err: Error, result: any) {
                should.exist(err);
            });
            module.clientHandler(agent, msg2, function (err: Error, result: any) {
                should.exist(err);
            });

        });

    });
});
