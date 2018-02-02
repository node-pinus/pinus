import { getLogger, Logger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'mqtt-acceptor');
import { EventEmitter } from 'events';
import { Tracer } from '../../util/tracer';
import * as utils from '../../util/utils';
let MqttCon: any = require('mqtt-connection');
import * as util from 'util';
import * as net from 'net';
import { Socket } from 'net';
import {AcceptorOpts, IAcceptor, AcceptorCallback} from '../acceptor';
import { MsgPkg } from '../dispatcher';

export interface AcceptorPkg {
    source: string;
    remote: string;
    id: string & number;
    seq: number;
    msg: MsgPkg;
}



let curId = 1;
export class MQTTAcceptor extends EventEmitter implements IAcceptor {
    interval: number; // flush interval in ms
    bufferMsg: any;
    rpcLogger: any;
    rpcDebugLog: any;
    _interval: any; // interval object
    sockets: any;
    msgQueues: any;
    cb: AcceptorCallback;
    inited: boolean;
    server: net.Server;
    closed: boolean;

    constructor(opts: AcceptorOpts, cb: AcceptorCallback) {
        super();
        this.interval = opts.interval; // flush interval in ms
        this.bufferMsg = opts.bufferMsg;
        this.rpcLogger = opts.rpcLogger;
        this.rpcDebugLog = opts.rpcDebugLog;
        this._interval = null; // interval object
        this.sockets = {};
        this.msgQueues = {};
        this.cb = cb;
    }

    listen(port: number|string) {
        // check status
        if (this.inited) {
        //    this.cb(new Error('already inited.'));
         //   return;
            throw new Error('already inited.');
        }
        this.inited = true;

        let self = this;

        this.server = new net.Server();
        this.server.listen(port);

        this.server.on('error', (err) => {
            logger.error('rpc server is error: %j', err.stack);
            self.emit('error', err, this);
        });

        this.server.on('connection', function (stream) {
            let socket = MqttCon(stream);
            socket['id'] = curId++;

            socket.on('connect', function (pkg: any) {
                console.log('connected');
            });

            socket.on('publish', function (pkg: any) {
                pkg = pkg.payload.toString();
                let isArray = false;
                try {
                    pkg = JSON.parse(pkg);
                    if (pkg instanceof Array) {
                        self.processMsgs(socket, pkg);
                        isArray = true;
                    } else {
                        self.processMsg(socket, pkg);
                    }
                } catch (err) {
                    if (!isArray) {
                        self.doSend(socket, {
                            id: pkg.id,
                            resp: [self.cloneError(err)]
                        });
                    }
                    logger.error('process rpc message error %s', err.stack);
                }
            });

            socket.on('pingreq', function () {
                socket.pingresp();
            });

            socket.on('error', function () {
                self.onSocketClose(socket);
            });

            socket.on('close', function () {
                self.onSocketClose(socket);
            });

            self.sockets[socket.id] = socket;

            socket.on('disconnect', function (reason: Error) {
                self.onSocketClose(socket);
            });
        });

        if (this.bufferMsg) {
            this._interval = setInterval(function () {
                self.flush();
            }, this.interval);
        }
    }

    close() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this.server.close();
        this.emit('closed');
    }

    onSocketClose(socket: {[key: string]: any}) {
        if (!socket['closed']) {
            let id = socket.id;
            socket['closed'] = true;
            delete this.sockets[id];
            delete this.msgQueues[id];
        }
    }

    cloneError(origin: {msg: string, stack: object}) {
        // copy the stack infos for Error instance json result is empty
        let res = {
            msg: origin.msg,
            stack: origin.stack
        };
        return res;
    }

    processMsg(socket: object, pkg: AcceptorPkg) {
        let tracer: Tracer = null;
        if (this.rpcDebugLog) {
            tracer = new Tracer(this.rpcLogger, this.rpcDebugLog, pkg.remote, pkg.source, pkg.msg, pkg.id, pkg.seq);
            tracer.info('server', __filename, 'processMsg', 'mqtt-acceptor receive message and try to process message');
        }
        this.cb(tracer, pkg.msg,  (... args: any[]) => {
            let errorArg = args[0]; // first callback argument can be error object, the others are message
            if (errorArg && errorArg instanceof Error) {
                args[0] = this.cloneError(<any>errorArg);
            }

            let resp;
            if (tracer && tracer.isEnabled) {
                resp = {
                    traceId: tracer.id,
                    seqId: tracer.seq,
                    source: tracer.source,
                    id: pkg.id,
                    resp: args
                };
            } else {
                resp = {
                    id: pkg.id,
                    resp: args
                };
            }
            if (this.bufferMsg) {
                this.enqueue(socket, resp);
            } else {
                this.doSend(socket, resp);
            }
        });
    }

    processMsgs(socket: any, pkgs: Array<AcceptorPkg>) {
        for (let i = 0, l = pkgs.length; i < l; i++) {
            this.processMsg(socket, pkgs[i]);
        }
    }

    enqueue(socket: any, msg: {[key: string]: any}) {
        let id = socket.id;
        let queue = this.msgQueues[id];
        if (!queue) {
            queue = this.msgQueues[id] = [];
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
            this.doSend(socket, queue);
            queues[socketId] = [];
        }
    }

    doSend(socket: any, msg: {[key: string]: any}) {
        socket.publish({
            topic: 'rpc',
            payload: JSON.stringify(msg)
        });
    }

}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
export function create(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    return new MQTTAcceptor(opts || <any>{}, cb);
}