/**
 * Default mailbox factory
 */
import * as Mailbox from './mailboxes/mqtt-mailbox';
import { MailBox } from './mailboxes/mqtt-mailbox';
// let Ws2Mailbox from ('./mailboxes/ws2-mailbox');
// let WsMailbox from ('./mailboxes/ws-mailbox');
import {create as tcpMailBoxCreate} from './mailboxes/tcp-mailbox';
import {EventEmitter} from 'events';
import {Tracer} from '../util/tracer';



export interface MailBoxTimeoutCallback {
    (tracer: Tracer , err: Error , resp ?: any): void;
}

export interface MailBoxOpts {
    bufferMsg?: boolean;
    keepalive?: number;
    interval?: number;
    timeout?: number;
    context?: any;
    pkgSize?: number;
    ping?: number;
    pong?: number;
}

export interface MailBoxMessage {
    service: string;
    method: string;
    args: any[];
}

export interface IMailBox {
    close(): void;
    send(tracer: Tracer, msg: MailBoxMessage, opts: any, cb: MailBoxTimeoutCallback): void;
    on(event: 'close', listener: (serverid: string) => void): this;
    connect(tracer: Tracer, cb: (err?: Error) => void): void;
}

export interface IMailBoxFactory {
    (serverInfo: {id: string, host: string, port: number}, opts: MailBoxOpts): IMailBox;
}

export interface MailBoxPkg {
    id: string & number;
    resp: any;
    source: string;
    seq: number;
}

/**
 * default mailbox factory
 *
 * @param {Object} serverInfo single server instance info, {id, host, port, ...}
 * @param {Object} opts construct parameters
 * @return {Object} mailbox instancef
 */
export function createMqttMailBox (serverInfo: {id: string, host: string, port: number}, opts: MailBoxOpts): IMailBox {
    // let mailbox = opts.mailbox || 'mqtt';
    // let Mailbox = null;
    // if (mailbox == 'ws') {
    //     Mailbox = WsMailbox;
    // } else if (mailbox == 'ws2') {
    //     Mailbox = Ws2Mailbox;
    // } else if (mailbox == 'mqtt') {
    //     Mailbox = MqttMailbox;
    // }
    return Mailbox.create(serverInfo, opts);
}

export const createTcpMailBox = tcpMailBoxCreate;