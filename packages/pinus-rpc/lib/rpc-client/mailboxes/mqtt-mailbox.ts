import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'mqtt-mailbox');
import { EventEmitter } from 'events';
import { constants } from '../../util/constants';
import { Tracer } from '../../util/tracer';
let MqttCon: any = require('mqtt-connection');
import * as utils from '../../util/utils';
import * as util from 'util';
import * as net from 'net';
import {IMailBox, MailBoxTimeoutCallback, MailBoxMessage, MailBoxOpts, MailBoxPkg} from '../mailbox';






let CONNECT_TIMEOUT = 2000;

export class MailBox extends EventEmitter implements IMailBox {

    constructor(serverInfo: {id: string, host: string, port: number}, opts: MailBoxOpts) {
        super();
        this.id = serverInfo.id;
        this.host = serverInfo.host;
        this.port = serverInfo.port;


        this.bufferMsg = opts.bufferMsg;
        this.keepalive = opts.keepalive || constants.DEFAULT_PARAM.KEEPALIVE;
        this.interval = opts.interval || constants.DEFAULT_PARAM.INTERVAL;
        this.timeoutValue = opts.timeout || constants.DEFAULT_PARAM.CALLBACK_TIMEOUT;


        this.opts = opts;
        this.serverId = opts.context.serverId;
    }

    curId = 0;
    id: string;
    host: string;
    port: number;
    requests: {[id: number]: MailBoxTimeoutCallback} = {};
    timeout: {[id: number]: NodeJS.Timer} = {};
    queue: MailBoxMessage[] = [];
    bufferMsg: boolean;
    keepalive: number;
    interval: number;
    timeoutValue: any;
    keepaliveTimer: NodeJS.Timer;
    lastPing = -1;
    lastPong = -1;
    connected = false;
    closed = false;
    opts: any;
    serverId: string;
    socket: any;
    _interval: NodeJS.Timer;
    _errored = false;

    connect(tracer: Tracer, cb: (err?: Error) => void) {
        tracer && tracer.info('client', __filename, 'connect', 'mqtt-mailbox try to connect');
        if (this.connected) {
            tracer && tracer.error('client', __filename, 'connect', 'mailbox has already connected');
            return cb(new Error('mailbox has already connected.'));
        }

        let self = this;

        let stream = net.createConnection(this.port, this.host);
        this.socket = MqttCon(stream);

        let connectTimeout = setTimeout( () => {
            logger.error('rpc client %s connect to remote server %s timeout', self.serverId, self.id);
            self.emit('close', self.id);
        }, CONNECT_TIMEOUT);

        this.socket.connect({
            clientId: 'MQTT_RPC_' + Date.now()
        },  () => {
                if (self.connected) {
                    return;
                }

                clearTimeout(connectTimeout);
                if(self._errored) {
                    cb(new Error('mqtt-mailbox errored'));
                    return;
                }
                self.connected = true;
                if (self.bufferMsg) {
                    self._interval = setInterval( () => {
                        self.flush();
                    }, self.interval);
                }

                self.setupKeepAlive();
                cb();
            });

        this.socket.on('publish', (pkg: any) => {
            pkg = pkg.payload.toString();
            try {
                pkg = JSON.parse(pkg);
                if (pkg instanceof Array) {
                    this.processMsgs( pkg);
                } else {
                    this.processMsg(pkg);
                }
            } catch (err) {
                logger.error('rpc client %s process remote server %s message with error: %s', self.serverId, self.id, err.stack);
            }
        });

        this.socket.on('error', function (err: any) {
            self._errored = true;
            logger.error('rpc socket %s is error, remote server %s host: %s, port: %s', self.serverId, self.id, self.host, self.port);
            if(err.code && err.code === 'ECONNREFUSED') {
            //    self.emit('error', constants.RPC_ERROR.FAIL_CONNECT_SERVER, tracer, self.id, null, self.opts);
                return;
            }
            self.emit('close', self.id);
        });

        this.socket.on('pingresp', function () {
            self.lastPong = Date.now();
        });

        this.socket.on('disconnect', function (reason: Error) {
            logger.error('rpc socket %s is disconnect from remote server %s, reason: %s', self.serverId, self.id, reason);
            let reqs: {[id: number]: any} = self.requests;
            for (let id in reqs) {
                let ReqCb = reqs[id];
                ReqCb(tracer, new Error(self.serverId + ' disconnect with remote server ' + self.id));
            }
            self.emit('close', self.id);
        });
    }

    /**
    * close mailbox
    */
    close() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.connected = false;
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this.socket.destroy();
    }

    /**
    * send message to remote server
    *
    * @param msg {service:"", method:"", args:[]}
    * @param opts {} attach info to send method
    * @param cb declaration decided by remote interface
    */
    send(tracer: Tracer, msg: MailBoxMessage, opts: any, cb: MailBoxTimeoutCallback) {
        tracer && tracer.info('client', __filename, 'send', 'mqtt-mailbox try to send');
        if (!this.connected) {
            tracer && tracer.error('client', __filename, 'send', 'mqtt-mailbox not init');
            cb(tracer, new Error(this.serverId + ' mqtt-mailbox is not init ' + this.id));
            return;
        }

        if (this.closed) {
            tracer && tracer.error('client', __filename, 'send', 'mailbox has already closed');
            cb(tracer, new Error(this.serverId + ' mqtt-mailbox has already closed ' + this.id));
            return;
        }

        let id = this.curId++;
        this.requests[id] = cb;
        this.setCbTimeout( id, tracer, cb);

        let pkg: any;
        if (tracer && tracer.isEnabled) {
            pkg = {
                traceId: tracer.id,
                seqId: tracer.seq,
                source: tracer.source,
                remote: tracer.remote,
                id: id,
                msg: msg
            };
        } else {
            pkg = {
                id: id,
                msg: msg
            };
        }
        if (this.bufferMsg) {
            this.enqueue( pkg);
        } else {
            this.doSend(this.socket, pkg);
        }
    }

    setupKeepAlive() {
        let self = this;
        this.keepaliveTimer = setInterval(function () {
            self.checkKeepAlive();
        }, this.keepalive);
    }

    checkKeepAlive() {
        if (this.closed) {
            return;
        }

        // console.log('checkKeepAlive lastPing %d lastPong %d ~~~', this.lastPing, this.lastPong);
        let now = Date.now();
        let KEEP_ALIVE_TIMEOUT = this.keepalive * 2;
        if (this.lastPing > 0) {
            if (this.lastPong < this.lastPing) {
                if (now - this.lastPing > KEEP_ALIVE_TIMEOUT) {
                    logger.error('mqtt rpc client %s checkKeepAlive timeout from remote server %s for %d lastPing: %s lastPong: %s', this.serverId, this.id, KEEP_ALIVE_TIMEOUT, this.lastPing, this.lastPong);
                    this.emit('close', this.id);
                    this.lastPing = -1;
                    // this.close();
                }
            } else {
                this.socket.pingreq();
                this.lastPing = Date.now();
            }
        } else {
            this.socket.pingreq();
            this.lastPing = Date.now();
        }
    }
    enqueue(msg: MailBoxMessage) {
        this.queue.push(msg);
    }

    flush() {
        if (this.closed || !this.queue.length) {
            return;
        }
        this.doSend(this.socket, this.queue);
        this.queue = [];
    }

    doSend(socket: any, msg: object) {
        socket.publish({
            topic: 'rpc',
            payload: JSON.stringify(msg)
        });
    }

    processMsgs(pkgs: Array<MailBoxPkg>) {
        for (let i = 0, l = pkgs.length; i < l; i++) {
            this.processMsg(pkgs[i]);
        }
    }

    processMsg(pkg: MailBoxPkg) {
        let pkgId = pkg.id;
        this.clearCbTimeout(pkgId);
        let cb = this.requests[pkgId];
        if (!cb) {
            return;
        }

        delete this.requests[pkgId];
        let rpcDebugLog = this.opts.rpcDebugLog;
        let tracer = null;
        let sendErr = null;
        if (rpcDebugLog) {
            tracer = new Tracer(this.opts.rpcLogger, this.opts.rpcDebugLog, this.opts.clientId, pkg.source, pkg.resp, pkg.id, pkg.seq);
        }
        let pkgResp = pkg.resp;

        cb(tracer, sendErr, pkgResp);
    }

    setCbTimeout(id: number, tracer: any, cb: Function) {
        let timer = setTimeout( () => {
            // logger.warn('rpc request is timeout, id: %s, host: %s, port: %s', id, this.host, this.port);
            this.clearCbTimeout(id);
            if (this.requests[id]) {
                delete this.requests[id];
            }
            let eMsg = util.format('rpc %s callback timeout %d, remote server %s host: %s, port: %s', this.serverId, this.timeoutValue, id, this.host, this.port);
            logger.error(eMsg);
            cb(tracer, new Error(eMsg));
        }, this.timeoutValue);
        this.timeout[id] = timer;
    }

    clearCbTimeout(id: number) {
        if (!this.timeout[id]) {
            logger.warn('timer is not exsits, serverId: %s remote: %s, host: %s, port: %s', this.serverId, id, this.host, this.port);
            return;
        }
        clearTimeout(this.timeout[id]);
        delete this.timeout[id];
    }

}
/**
* Factory method to create mailbox
*
* @param {Object} server remote server info {id:"", host:"", port:""}
* @param {Object} opts construct parameters
*                      opts.bufferMsg {Boolean} msg should be buffered or send immediately.
*                      opts.interval {Boolean} msg queue flush interval if bufferMsg is true. default is 50 ms
*/
export function create(server: {id: string, host: string, port: number}, opts: MailBoxOpts): IMailBox {
    return new MailBox(server, opts || <any>{});
}