import { getLogger } from 'pinus-logger';
import * as utils from '../util/utils';
import * as Constants from '../util/constants';
import * as countDownLatch from '../util/countDownLatch';
import { EventEmitter } from 'events';
import * as util from 'util';
import { Application } from '../application';
import { ServerInfo } from '../util/constants';
import { ConsoleService, MasterAgent } from 'pinus-admin';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


export class Watchdog extends EventEmitter {

    isStarted = false;
    servers: {[serverId: string]: ServerInfo} = {};
    _listeners: {[serverId: string]: number} = {};
    count: number;
    constructor(private app: Application, private service: ConsoleService) {
        super();

        this.count = utils.size(app.getServersFromConfig());

    }


    addServer(server: ServerInfo) {
        if (!server) {
            return;
        }
        this.servers[server.id] = server;
        this.notify({ action: 'addServer', server: server });
    }

    removeServer(id: string) {
        if (!id) {
            return;
        }
        this.unsubscribe(id);
        delete this.servers[id];
        this.notify({ action: 'removeServer', id: id });
    }

    reconnectServer(server: ServerInfo) {
        let self = this;
        if (!server) {
            return;
        }
        if (!this.servers[server.id]) {
            this.servers[server.id] = server;
        }
        // replace server in reconnect server
        this.notifyById(server.id, { action: 'replaceServer', servers: self.servers });
        // notify other server to add server
        this.notify({ action: 'addServer', server: server });
        // add server in listener
        this.subscribe(server.id);
    }

    subscribe(id: string) {
        this._listeners[id] = 1;
    }

    unsubscribe(id: string) {
        delete this._listeners[id];
    }

    query() {
        return this.servers;
    }

    record(id: string) {
        if (!this.isStarted && --this.count < 0) {
            let usedTime = Date.now() - this.app.startTime;
            this.notify({ action: 'startOver' });
            this.isStarted = true;
            logger.warn('all servers startup in %s ms', usedTime);
        }
    }

    notifyById(id: string, msg: any) {
        (this.service.agent as MasterAgent).request(id, Constants.KEYWORDS.MONITOR_WATCHER, msg, function (signal: any) {
            if (signal !== Constants.SIGNAL.OK) {
                logger.error('master watchdog fail to notify to monitor, id: %s, msg: %j', id, msg);
            } else {
                logger.debug('master watchdog notify to monitor success, id: %s, msg: %j', id, msg);
            }
        });
    }

    notify(msg: any) {
        let _listeners = this._listeners;
        let success = true;
        let fails: string[] = [];
        let timeouts: string[] = [];
        let requests: {[key: string]: number} = {};
        let count = utils.size(_listeners);
        if (count === 0) {
            logger.warn('master watchdog _listeners is none, msg: %j', msg);
            return;
        }
        let latch = countDownLatch.createCountDownLatch(count, { timeout: Constants.TIME.TIME_WAIT_COUNTDOWN }, function (isTimeout) {
            if (!!isTimeout) {
                for (let key in requests) {
                    if (!requests[key]) {
                        timeouts.push(key);
                    }
                }
                logger.error('master watchdog request timeout message: %j, timeouts: %j, fails: %j', msg, timeouts, fails);
            }
            if (!success) {
                logger.error('master watchdog request fail message: %j, fails: %j', msg, fails);
            }
        });

        let moduleRequest = function (self: Watchdog, id: string) {
            return (function () {
                (self.service.agent as MasterAgent).request(id, Constants.KEYWORDS.MONITOR_WATCHER, msg, function (signal: any) {
                    if (signal !== Constants.SIGNAL.OK) {
                        fails.push(id);
                        success = false;
                    }
                    requests[id] = 1;
                    latch.done();
                });
            })();
        };

        for (let id in _listeners) {
            requests[id] = 0;
            moduleRequest(this, id);
        }
    }
}