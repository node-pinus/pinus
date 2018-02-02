import {MQTTAcceptor} from './acceptors/mqtt-acceptor';
import {Tracer} from '../util/tracer';
import {TCPAcceptor} from './acceptors/tcp-acceptor';
import {Logger} from 'pinus-logger';
import {EventEmitter} from 'events';
import {MsgPkg} from './dispatcher';
import * as Gateway from './gateway';
// let acceptor from ('./acceptors/ws2-acceptor');

export interface ProcessMsgCallBack {
    (err: Error|null, ... args: any[]): void;
}
export type AcceptorCallback = (tracer: Tracer, msg: MsgPkg, cb: ProcessMsgCallBack) => void;


export interface IAcceptorFactory {
    (opts: Gateway.RpcServerOpts, cb: AcceptorCallback): IAcceptor;
}

export interface AcceptorOpts {
    interval?: number;
    bufferMsg?: boolean;
    rpcLogger?: Logger;
    rpcDebugLog?: boolean;
    pkgSize?: number;
    tracer?: Tracer;
    ping?: number;
}

export interface IAcceptor {
    close(): void;
    listen(port: number): void;
    on(event: 'error', cb: (err: Error, self: IAcceptor) => void): this;
    on(event: 'closed', cb: () => void): this;
}

export function createDefaultAcceptor(opts: AcceptorOpts, cb: AcceptorCallback): IAcceptor {
    return new MQTTAcceptor(opts, cb);
}

export function createTcpAcceptor(opts: AcceptorOpts, cb: AcceptorCallback): IAcceptor {
    return new TCPAcceptor(opts, cb);
}