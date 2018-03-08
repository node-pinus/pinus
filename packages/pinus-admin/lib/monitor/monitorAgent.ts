import { getLogger } from 'pinus-logger';
import { MqttClient } from '../protocol/mqtt/mqttClient';
import {EventEmitter } from 'events';
import * as protocol from '../util/protocol';
import * as utils from '../util/utils';
import * as Util from 'util';
import { ServerInfo, AdminServerInfo, Callback } from '../util/constants';
import { ConsoleService } from '../consoleService';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));

let ST_INITED = 1;
let ST_CONNECTED = 2;
let ST_REGISTERED = 3;
let ST_CLOSED = 4;
let STATUS_INTERVAL = 5 * 1000; // 60 seconds

export interface MonitorAgentOpts { id: string; type: string; info: ServerInfo; consoleService: ConsoleService; }


/**
 * MonitorAgent Constructor
 *
 * @class MasterAgent
 * @constructor
 * @param {Object} opts construct parameter
 *                 opts.consoleService {Object} consoleService
 *                 opts.id             {String} server id
 *                 opts.type           {String} server type, 'master', 'connector', etc.
 *                 opts.info           {Object} more server info for current server, {id, serverType, host, port}
 * @api public
 */
export class MonitorAgent extends EventEmitter {
    opts: MonitorAgentOpts;
    id: string;
    type: string;
    info: ServerInfo;
    consoleService: ConsoleService;

    reqId = 1;
    socket: MqttClient;
    callbacks: {[reqId: number]: Callback} = {};
    state = ST_INITED;
    constructor(opts: MonitorAgentOpts) {
        super();
        this.reqId = 1;
        this.opts = opts;
        this.id = opts.id;
        this.socket = null;
        this.callbacks = {};
        this.type = opts.type;
        this.info = opts.info;
        this.state = ST_INITED;
        this.consoleService = opts.consoleService;
    }

    /**
     * register and connect to master server
     *
     * @param {String} port
     * @param {String} host
     * @param {Function} cb callback function
     * @api public
     */
    connect(port: number, host: string, cb: (err?: Error) => void) {
        if (this.state > ST_INITED) {
            logger.error('monitor client has connected or closed.');
            return;
        }

        cb = cb || function () { };

        this.socket = new MqttClient(this.opts);
        this.socket.connect(host, port);

        // this.socket = sclient.connect(host + ':' + port, {
        //   'force new connection': true,
        //   'reconnect': true,
        //   'max reconnection attempts': 20
        // });
        let self = this;
        this.socket.on('register', function (msg) {
            if (msg && msg.code === protocol.PRO_OK) {
                self.state = ST_REGISTERED;
                cb();
            } else {
                self.emit('close');
                logger.error('server %j %j register master failed:' + JSON.stringify(msg), self.id, self.type, );
            }
        });

        this.socket.on('monitor', function (msg) {
            if (self.state !== ST_REGISTERED) {
                return;
            }

            msg = protocol.parse(msg);

            if (msg.command) {
                // a command from master
                self.consoleService.command(msg.command, msg.moduleId, msg.body, function (err, res) {
                    // notify should not have a callback
                });
            } else {
                let respId = msg.respId;
                if (respId) {
                    // a response from monitor
                    let respCb = self.callbacks[respId];
                    if (!respCb) {
                        logger.warn('unknown resp id:' + respId);
                        return;
                    }
                    delete self.callbacks[respId];
                    respCb(msg.error, msg.body);
                    return;
                }

                // request from master
                self.consoleService.execute(msg.moduleId, 'monitorHandler', msg.body, function (err, res) {
                    if (protocol.isRequest(msg)) {
                        let resp = protocol.composeResponse(msg, err, res);
                        if (resp) {
                            self.doSend('monitor', resp);
                        }
                    } else {
                        // notify should not have a callback
                        logger.error('notify should not have a callback.');
                    }
                });
            }
        });

        this.socket.on('connect', function () {
            if (self.state > ST_INITED) {
                // ignore reconnect
                return;
            }
            self.state = ST_CONNECTED;
            let req = {
                id: self.id,
                type: 'monitor',
                serverType: self.type,
                pid: process.pid,
                info: self.info,
                token: undefined as string
            };
            let authServer = self.consoleService.authServer;
            let env = self.consoleService.env;
            authServer(req, env, function (token) {
                req['token'] = token;
                self.doSend('register', req);
            });
        });

        this.socket.on('error', function (err) {
            if (self.state < ST_CONNECTED) {
                // error occurs during connecting stage
                cb(err);
            } else {
                self.emit('error', err);
            }
        });

        this.socket.on('disconnect', function (reason) {
            self.state = ST_CLOSED;
            self.emit('close');
        });

        this.socket.on('reconnect', function () {
            self.state = ST_CONNECTED;
            let req = {
                id: self.id,
                type: 'monitor',
                info: self.info,
                pid: process.pid,
                serverType: self.type
            };

            self.doSend('reconnect', req);
        });

        this.socket.on('reconnect_ok', function (msg) {
            if (msg && msg.code === protocol.PRO_OK) {
                self.state = ST_REGISTERED;
            }
        });
    }

    /**
     * close monitor agent
     *
     * @api public
     */
    close() {
        if (this.state >= ST_CLOSED) {
            return;
        }
        this.state = ST_CLOSED;
        this.socket.disconnect();
    }

    /**
     * set module
     *
     * @param {String} moduleId module id/name
     * @param {Object} value module object
     * @api public
     */
    set(moduleId: string, value: any) {
        this.consoleService.set(moduleId, value);
    }

    /**
     * get module
     *
     * @param {String} moduleId module id/name
     * @api public
     */
    get(moduleId: string) {
        return this.consoleService.get(moduleId);
    }

    /**
     * notify master server without callback
     *
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api public
     */
    notify(moduleId: string, msg: any) {
        if (this.state !== ST_REGISTERED) {
            logger.error('agent can not notify now, state:' + this.state);
            return;
        }
        this.doSend('monitor', protocol.composeRequest(null, moduleId, msg));
        // this.socket.emit('monitor', protocol.composeRequest(null, moduleId, msg));
    }

    request(moduleId: string, msg: any, cb: Callback) {
        if (this.state !== ST_REGISTERED) {
            logger.error('agent can not request now, state:' + this.state);
            return;
        }
        let reqId = this.reqId++;
        this.callbacks[reqId] = cb;
        this.doSend('monitor', protocol.composeRequest(reqId, moduleId, msg));
        // this.socket.emit('monitor', protocol.composeRequest(reqId, moduleId, msg));
    }

    doSend(topic: string, msg: any) {
        this.socket.send(topic, msg);
    }
}