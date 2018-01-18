import {MQTTAcceptor} from './acceptors/mqtt-acceptor';
import {Tracer} from '../util/tracer';
import {TCPAcceptor} from './acceptors/tcp-acceptor';
import {Logger} from 'pinus-logger';
import {EventEmitter} from 'events';
import {MsgPkg} from './dispatcher';
import * as Gateway from './gateway';
// let acceptor from ('./acceptors/ws2-acceptor');

interface ProcessMsgCallBack {
    (err: Error|null, ... args: any[]): void;
    (... args: any[]): void;
}

export interface IAcceptorFactory {
    (opts: Gateway.RpcServerOpts, cb: (tracer: Tracer, msg ?: MsgPkg, cb ?: Function) => void): IAcceptor;
}

export interface AcceptorOpts {
    interval?: number;
    bufferMsg?: boolean;
    rpcLogger?: Logger;
    rpcDebugLog?: boolean;
    pkgSize?: number;
    tracer?: Tracer;
}

export interface IAcceptorConstructor {
    new (opts: AcceptorOpts, cb: (tracer: Tracer, msg ?: MsgPkg, cb ?: ProcessMsgCallBack) => void): IAcceptor;
}

export interface IAcceptor extends EventEmitter {
    close(): void;
    listen(port: number): void;
    cb: (err: Error|null, msg: MsgPkg, cb: ProcessMsgCallBack) => void;
}

export function createDefaultAcceptor(opts: AcceptorOpts, cb: (tracer: Tracer, msg ?: MsgPkg, cb ?: Function) => void): IAcceptor {
    return new MQTTAcceptor(opts, cb);
}

export function createTcpAcceptor(opts: AcceptorOpts, cb: (tracer: Tracer, msg ?: MsgPkg, cb ?: Function) => void): IAcceptor {
    return new TCPAcceptor(opts, cb);
}