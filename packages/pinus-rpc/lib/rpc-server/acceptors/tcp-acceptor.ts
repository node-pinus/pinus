import {EventEmitter} from 'events';
import {Tracer} from '../../util/tracer';
import * as utils from '../../util/utils';
import {Composer} from '../../util/composer';
import * as util from 'util';
import * as net from 'net';
import * as Coder from '../../util/coder';
import {AcceptorOpts, IAcceptor, AcceptorCallback} from '../acceptor';
import { getLogger, Logger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'tcp-acceptor');

export interface AcceptorPkg {
    source: string;
    remote: string;
    id: string & number;
    seq: number;
    msg: string;
}

const MSG_TYPE = 0;
const PING = 1;
const PONG = 2;
const RES_TYPE = 3;

export class TCPAcceptor extends EventEmitter implements IAcceptor {
    bufferMsg: any;
    interval: number; // flush interval in ms
    pkgSize: number;
    _interval: any; // interval object
    server: any;
    rpcLogger: any;
    rpcDebugLog: any;
    sockets: { [key: string]: net.Socket | any } = {};
    msgQueues: { [key: string]: any } = {};
    cb: (tracer: any, msg?: any, cb?: Function) => void;
    inited: boolean = false;
    closed: boolean;

    ping: number;

    timer: {[key: number]: NodeJS.Timer};

    socketId: number;

    constructor(opts: AcceptorOpts, cb: AcceptorCallback) {
        super();
        this.bufferMsg = opts.bufferMsg;
        this.interval = opts.interval; // flush interval in ms
        this.pkgSize = opts.pkgSize;
        this.rpcLogger = opts.rpcLogger;
        this.rpcDebugLog = opts.rpcDebugLog;
        this._interval = null; // interval object
        // Heartbeat ping interval.
        this.ping = 'ping' in opts ? opts.ping : 25e3;
        // ping timer for each client connection
        this.timer = {};
        this.server = null;
        this.sockets = {};
        this.msgQueues = {};
        this.cb = cb;
        this.socketId = 0;
    }

    listen(port: string | number) {
        // check status
        if (this.inited) {
            throw new Error('already inited.');
        }
        this.inited = true;


        this.server = net.createServer();
        this.server.listen(port);

        this.server.on('error', (err: Error) => {
            logger.error('rpc tcp server is error: %j', err.stack);
            this.emit('error', err, this);
        });

        this.server.on('connection', (socket: net.Socket | any) => {
            socket.id = this.socketId++;
            this.sockets[socket.id] = socket;
            socket.composer = new Composer({
                maxLength: this.pkgSize
            });
            this.timer[socket.id] = null;
            this.heartbeat(socket.id);
            socket.on('data', (data: Buffer) => {
                socket.composer.feed(data);
            });

            socket.composer.on('data', (data: Buffer) => {
                this.heartbeat(socket.id);
                if(data[0] === PING) {
                    // incoming::ping
                    socket.write(socket.composer.compose(PONG));
                    return;
                }

                try {
                    const pkg = JSON.parse(data.toString('utf-8', 1));
                    // let id  = null;
                    //
                    if(pkg instanceof Array) {
                        this.processMsgs(socket, pkg);
                    } else {
                        this.processMsg(socket, pkg);
                    }
                } catch(err) { // json parse exception
                    if(err) {
                        socket.composer.reset();
                        logger.error(err.stack);
                    }
                }
            });

            socket.on('error', (err: Error) => {
                logger.error('tcp socket error: %j', err);
            });

            socket.on('close', () => {
                logger.error('tcp socket close: %s', socket.id);
                delete this.sockets[socket.id];
                delete this.msgQueues[socket.id];
                if(this.timer[socket.id]) {
                    clearTimeout(this.timer[socket.id]);
                }
                delete this.timer[socket.id];
            });
        });

        if (this.bufferMsg) {
            this._interval = setInterval(() => {
                this.flush();
            }, this.interval);
        }
    }


    /**
     * Send a new heartbeat over the connection to ensure that we're still
     * connected and our internet connection didn't drop. We cannot use server side
     * heartbeats for this unfortunately.
     *
     * @api private
     */
    heartbeat(socketId: number) {
        if(!this.ping) return;

        if(this.timer[socketId]) {
            this.sockets[socketId].heartbeat = true;
            return;
        }
        /**
         * Exterminate the connection as we've timed out.
         */
        function ping(self: TCPAcceptor, socketId: number) {
            // if pkg come, modify heartbeat flag, return;
            if(self.sockets[socketId].heartbeat) {
                self.sockets[socketId].heartbeat = false;
                return;
            }
            // if no pkg come
            // remove listener on socket,close socket
            if(self.timer[socketId]) {
                clearInterval(self.timer[socketId]);
                self.timer[socketId] = null;
            }

            self.sockets[socketId].composer.removeAllListeners();
            self.sockets[socketId].removeAllListeners();

            self.sockets[socketId].destroy();
            delete self.sockets[socketId];
            delete self.msgQueues[socketId];
            logger.warn('ping timeout with socket id: %s', socketId);
        }
        this.timer[socketId] = setInterval(ping.bind(null, this, socketId), this.ping + 5e3);
        logger.info('wait ping with socket id: %s' , socketId);
    }


    close() {
        if (!!this.closed) {
            return;
        }
        this.closed = true;
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        try {
            this.server.close();
        } catch (err) {
            logger.error('rpc server close error: %j', err.stack);
        }
        this.emit('closed');
    }

    cloneError(origin: { msg: any, stack: any }) {
        // copy the stack infos for Error instance json result is empty
        let res = {
            msg: origin.msg,
            stack: origin.stack
        };
        return res;
    }

    respCallback(socket: net.Socket | any, pkg: AcceptorPkg, tracer: Tracer, ...args: any []) {
        for(let i = 0, l = args.length; i < l; i++) {
            if(args[i] instanceof Error) {
                args[i] = this.cloneError(args[i]);
            }
        }
        let resp;
        if(tracer && tracer.isEnabled) {
            resp = {traceId: tracer.id, seqId: tracer.seq, source: tracer.source, id: pkg.id, resp: args};
        }
        else {
            resp = {id: pkg.id, resp: args};
        }
        if(this.bufferMsg) {
            this.enqueue(socket, resp);
        } else {
            socket.write(socket.composer.compose(RES_TYPE, JSON.stringify(resp), null));
        }
    }

    processMsg(socket: any, pkg: AcceptorPkg) {
        let tracer: Tracer = null;
        if (this.rpcDebugLog) {
            tracer = new Tracer(this.rpcLogger, this.rpcDebugLog, pkg.remote, pkg.source, pkg.msg, pkg.id, pkg.seq);
            tracer.info('server', __filename, 'processMsg', 'tcp-acceptor receive message and try to process message');
        }
        this.cb(tracer, pkg.msg, pkg.id ? this.respCallback.bind(this, socket, pkg, tracer) : null);
    }

    processMsgs(socket: any, pkgs: Array<AcceptorPkg>) {
        for (let i = 0, l = pkgs.length; i < l; i++) {
            this.processMsg(socket, pkgs[i]);
        }
    }

    enqueue(socket: any, msg: {[key: string]: any}) {
        let queue = this.msgQueues[socket.id];
        if (!queue) {
            queue = this.msgQueues[socket.id] = [];
        }
        queue.push(msg);
    }

    flush() {
        let sockets = this.sockets,
            queues = this.msgQueues,
            queue, socket;
        for (let socketId in queues) {
            socket = sockets[socketId];
            if (!socket) {
                // clear pending messages if the socket not exist any more
                delete queues[socketId];
                continue;
            }
            queue = queues[socketId];
            if (!queue.length) {
                continue;
            }
            socket.write(socket.composer.compose(JSON.stringify(queue)));
            queues[socketId] = [];
        }
    }
}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
export function create(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    return new TCPAcceptor(opts || <any>{}, cb);
}

process.on('SIGINT', function () {
    process.exit();
});