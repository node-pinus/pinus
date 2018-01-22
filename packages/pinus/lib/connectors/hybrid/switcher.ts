import { EventEmitter } from 'events';
import * as util from 'util';
import { WSProcessor } from './wsprocessor';
import { TCPProcessor } from './tcpprocessor';
import { getLogger } from 'pinus-logger';
import * as net from 'net';
import * as tls from 'tls';
import { TlsOptions } from 'tls';
import * as WebSocket from 'ws';
import { TcpSocket } from './tcpsocket';
import { IHybridSocket } from './IHybridSocket';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


let HTTP_METHODS = [
    'GET', 'POST', 'DELETE', 'PUT', 'HEAD'
];

let ST_STARTED = 1;
let ST_CLOSED = 2;

let DEFAULT_TIMEOUT = 90;

export interface HybridSwitcherOptions {
    closeMethod ?: 'end';
    timeout ?: number;
    setNoDelay ?: boolean;
    ssl ?: TlsOptions;
}
export interface IHybridSwitcher {
    on(evt: 'connection' , listener: (socket: IHybridSocket) => void): void;
}

/**
 * Switcher for tcp and websocket protocol
 *
 * @param {Object} server tcp server instance from node.js net module
 */
export class HybridSwitcher extends EventEmitter implements IHybridSwitcher {
    server: net.Server;
    wsprocessor: WSProcessor;
    tcpprocessor: TCPProcessor;
    id: number;
    timeout: number;
    setNoDelay: boolean;
    state: number;


    constructor(server: net.Server, opts: HybridSwitcherOptions) {
        super();
        this.server = server;
        this.wsprocessor = new WSProcessor();
        this.tcpprocessor = new TCPProcessor(opts.closeMethod);
        this.id = 1;
        this.timeout = (opts.timeout || DEFAULT_TIMEOUT) * 1000;
        this.setNoDelay = opts.setNoDelay;

        if (!opts.ssl) {
            this.server.on('connection', this.newSocket.bind(this));
        } else {
            this.server.on('secureConnection', this.newSocket.bind(this));
            this.server.on('clientError', function (e, tlsSo) {
                logger.warn('an ssl error occured before handshake established: ', e);
                tlsSo.destroy();
            });
        }

        this.wsprocessor.on('connection', this.emit.bind(this, 'connection'));
        this.tcpprocessor.on('connection', this.emit.bind(this, 'connection'));

        this.state = ST_STARTED;
    }

    newSocket(socket: net.Socket) {
        if (this.state !== ST_STARTED) {
            return;
        }

        socket.on('error',  (err: Error) => {
            logger.debug('connection error:%s, the remote ip is %s && port is %s', err.message, socket.remoteAddress, socket.remotePort);
            socket.destroy();
        });

        socket.on('close',  () => {
            socket.destroy();
        });
        socket.setTimeout(this.timeout, function () {
            logger.warn('connection is timeout without communication, the remote ip is %s && port is %s',
                socket.remoteAddress, socket.remotePort);
            socket.destroy();
        });

        let self = this;

        socket.once('data',  (data) => {
            // FIXME: handle incomplete HTTP method
            if (isHttp(data)) {
                this.processHttp(self.wsprocessor, socket, data);
            } else {
                if (!!self.setNoDelay) {
                    socket.setNoDelay(true);
                }
                this.processTcp(self.tcpprocessor, socket, data);
            }
        });
    }

    close() {
        if (this.state !== ST_STARTED) {
            return;
        }

        this.state = ST_CLOSED;
        this.wsprocessor.close();
        this.tcpprocessor.close();
    }

    private processHttp(processor: WSProcessor, socket: net.Socket, data: Buffer) {
        processor.add(socket, data);
    }

    private processTcp(processor: TCPProcessor, socket: net.Socket, data: Buffer) {
        processor.add(socket, data);
    }

}
let isHttp = function (data: Buffer) {
    let head = data.toString('utf8', 0, 4);

    for (let i = 0, l = HTTP_METHODS.length; i < l; i++) {
        if (head.indexOf(HTTP_METHODS[i]) === 0) {
            return true;
        }
    }

    return false;
};
