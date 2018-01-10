import { EventEmitter } from 'events';
import * as util from 'util';
import * as net from 'net';
import * as utils from '../../util/utils';
import { TcpSocket } from './tcpsocket';

let ST_STARTED = 1;
let ST_CLOSED = 2;

// private protocol, no need exports
let HEAD_SIZE = 4;

/**
 * websocket protocol processor
 */
export class TCPProcessor extends EventEmitter {
    closeMethod: 'end';
    state: number;
    constructor(closeMethod?: 'end') {
        super();
        this.closeMethod = closeMethod;
        this.state = ST_STARTED;
    }
    add(socket: net.Socket, data: Buffer) {
        if (this.state !== ST_STARTED) {
            return;
        }
        let tcpsocket = new TcpSocket(socket, {
            headSize: HEAD_SIZE,
            headHandler: utils.headHandler,
            closeMethod: this.closeMethod
        });
        this.emit('connection', tcpsocket);
        socket.emit('data', data);
    }

    close() {
        if (this.state !== ST_STARTED) {
            return;
        }
        this.state = ST_CLOSED;
    }
}