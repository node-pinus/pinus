import {getLogger} from 'pinus-logger';

let logger = getLogger('pinus-rpc', 'mqtt2-mailbox');
import {EventEmitter} from 'events';
import {Tracer} from '../../util/tracer';
import * as utils from '../../util/utils';

import  {Composer} from '../../util/composer';

import * as util from 'util';
import * as net from 'net';
import {Msg} from '../../util/coder';
import {IMailBox, MailBoxOpts, MailBoxPkg} from '../mailbox';

const DEFAULT_CALLBACK_TIMEOUT = 10 * 1000;
const DEFAULT_INTERVAL = 50;
const MSG_TYPE = 0;
const PING = 1;
const PONG = 2;


export class TCPMailBox extends EventEmitter implements IMailBox {
    curId: number = 0;
    id: string;
    host: string;
    port: number;
    requests: { [key: string]: any } = {};
    timeout: { [key: string]: any } = {};
    queue: Array<any> = [];
    bufferMsg: any;
    interval: number;
    timeoutValue: number;
    connected: boolean = false;
    closed: boolean = false;
    serverId: string;
    opts: any;
    socket: any = null;
    _interval: any;
    composer: Composer;
    ping: number;
    pong: number;
    timer: {ping?: NodeJS.Timer, pong?: NodeJS.Timer};

    constructor(serverInfo: {id: string, host: string, port: number}, opts: MailBoxOpts) {
        super();
        this.opts = opts || <any>{};
        this.id = serverInfo.id;
        this.host = serverInfo.host;
        this.port = serverInfo.port;
        this.composer = new Composer({
            maxLength: opts.pkgSize
        });
        this.bufferMsg = opts.bufferMsg;
        this.interval = opts.interval || DEFAULT_INTERVAL;
        this.timeoutValue = opts.timeout || DEFAULT_CALLBACK_TIMEOUT;
        // Heartbeat ping interval.
        this.ping = 'ping' in opts ? opts.ping : 25e3;

        // Heartbeat pong response timeout.
        this.pong = 'pong' in opts ? opts.pong : 10e3;

        this.timer = {};

        this.connected = false;
    }

    connect(tracer: Tracer, cb: (err?: Error) => void) {
        tracer && tracer.info('client', __filename, 'connect', 'tcp-mailbox try to connect');
        if (this.connected) {
            utils.invokeCallback(cb, new Error('mailbox has already connected.'));
            return;
        }

        this.socket = net.connect(<any>{
            port: this.port,
            host: this.host
        }, (err: Error) => {
            // success to connect
            this.connected = true;
            this.closed = false;
            if (this.bufferMsg) {
                // start flush interval
                this._interval = setInterval(() => {
                    this.flush();
                }, this.interval);
            }
            this.heartbeat();
            utils.invokeCallback(cb, err);
        });

        this.composer.on('data', (data: Buffer) => {
            if (data[0] === PONG) {
                // incoming::pong
                this.heartbeat();
                return;
            }
            try {
                const pkg = JSON.parse(data.toString('utf-8', 1));
                if(pkg instanceof Array) {
                    this.processMsgs(pkg);
                } else {
                    this.processMsg(pkg);
                }
            } catch(err) {
                if(err) {
                    logger.error('[pinus-rpc] tcp mailbox process data error: %j', err.stack);
                }
            }
        });

        this.socket.on('data', (data: any) => {
            this.composer.feed(data);
        });

        this.socket.on('error', (err: Error) => {
            if (!this.connected) {
                utils.invokeCallback(cb, err);
                return;
            }
         //   this.emit('error', err, this);
            this.emit('close', this.id);
        });

        this.socket.on('end', () => {
            this.emit('close', this.id);
        });
        // TODO: reconnect and heartbeat
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
        if(Object.keys(this.timer).length) {
            clearTimeout(this.timer['ping']);
            this.timer['ping'] = null;
            clearTimeout(this.timer['pong']);
            this.timer['pong'] = null;
        }
        if (this.socket) {
            this.socket.removeAllListeners();
            this.composer.removeAllListeners();
            this.socket.destroy();
            this.socket = null;
        }
    }

    /**
     * send message to remote server
     *
     * @param msg {service:"", method:"", args:[]}
     * @param opts {} attach info to send method
     * @param cb declaration decided by remote interface
     */
    send(tracer: Tracer, msg: Msg, opts: MailBoxOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void | null) {
        tracer && tracer.info('client', __filename, 'send', 'tcp-mailbox try to send');
        if (!this.connected) {
            utils.invokeCallback(cb, new Error('not init.'));
            return;
        }

        if (this.closed) {
            utils.invokeCallback(cb, new Error('mailbox alread closed.'));
            return;
        }

        let id = 0;
        if(cb) {
            id = this.curId++ & 0xffffffff;
            if(!id) {
                id = this.curId++ & 0xffffffff;
            }
            this.requests[id] = cb;
            this.setCbTimeout(id, tracer, cb);
        }
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
            this.enqueue(pkg);
        } else {
            this.socket.write(this.composer.compose(MSG_TYPE, JSON.stringify(pkg), id));
        }
    }

    /*
     * Send a new heartbeat over the connection to ensure that we're still
     * connected and our internet connection didn't drop. We cannot use server side
     * heartbeats for this unfortunately.
     * @api private
     */
    heartbeat() {
        if(!this.ping) return;

        if(this.timer['pong']) {
            clearTimeout(this.timer['pong']);
            this.timer['pong'] = null;
        }

        if(!this.timer['ping']) {
            this.timer['ping'] = setTimeout(ping, this.ping);
        }

        const self = this;
        /**
         * Exterminate the connection as we've timed out.
         *
         * @api private
         */
        function pong() {
            if(self.timer['pong']) {
                clearTimeout(self.timer['pong']);
                self.timer['pong'] = null;
            }

            self.emit('close', self.id);
            logger.warn('pong timeout');
        }

        /**
         * We should send a ping message to the server.
         *
         * @api private
         */
        function ping() {
            if(self.timer['ping']) {
                clearTimeout(self.timer['ping']);
                self.timer['ping'] = null;
            }
            self.socket.write(self.composer.compose(PING));
            self.timer['pong'] = setTimeout(pong, self.pong);
        }
    }

    enqueue(msg: Msg) {
        this.queue.push(msg);
    }

    flush() {
        if (this.closed || !this.queue.length) {
            return;
        }
        this.socket.write(this.composer.compose(MSG_TYPE, JSON.stringify(this.queue), this.queue[0].id));
        this.queue = [];
    }

    processMsgs(pkgs: Array<MailBoxPkg>) {
        for (let i = 0, l = pkgs.length; i < l; i++) {
            this.processMsg(pkgs[i]);
        }
    }

    processMsg(pkg: MailBoxPkg) {
        this.clearCbTimeout(<any>pkg.id);
        let cb = this.requests[pkg.id];
        if (!cb) {
            return;
        }
        delete this.requests[pkg.id];
        let tracer = null;
        if (this.opts.rpcDebugLog) {
            tracer = new Tracer(this.opts.rpcLogger, this.opts.rpcDebugLog, this.opts.clientId, pkg.source, pkg.resp, pkg.id, pkg.seq);
        }

        cb(tracer, null, pkg.resp);
    }

    setCbTimeout(id: number, tracer: Tracer, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
        const timer = setTimeout(() => {
            this.clearCbTimeout(id);
            if (!!this.requests[id]) {
                delete this.requests[id];
            }
            logger.error('rpc callback timeout, remote server host: %s, port: %s', this.host, this.port);
            if(cb) {
                cb(tracer, new Error('rpc callback timeout'));
            }
        }, this.timeoutValue);
        this.timeout[id] = timer;
    }

    clearCbTimeout(id: number) {
        if (!this.timeout[id]) {
            logger.warn('timer not exists, id: %s', id);
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
export const create = function (server: { id: string, host: string, port: number }, opts: MailBoxOpts): IMailBox {
    return new TCPMailBox(server, opts || <any>{});
};