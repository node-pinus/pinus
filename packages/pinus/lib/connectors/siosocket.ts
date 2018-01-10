import * as util from 'util';
import { EventEmitter } from 'events';
import { ISocket } from '../interfaces/ISocket';

let ST_INITED = 0;
let ST_CLOSED = 1;

/**
 * Socket class that wraps socket.io socket to provide unified interface for up level.
 */
export class SioSocket extends EventEmitter implements ISocket {
    id: number;
    socket: SocketIO.Socket;
    remoteAddress: { ip: string };
    state: number;

    constructor(id: number, socket: SocketIO.Socket) {
        super();
        this.id = id;
        this.socket = socket;
        this.remoteAddress = {
            ip: socket.handshake.address
        };

        let self = this;

        socket.on('disconnect', this.emit.bind(this, 'disconnect'));

        socket.on('error', this.emit.bind(this, 'error'));

        socket.on('message', function (msg) {
            self.emit('message', msg);
        });

        this.state = ST_INITED;

        // TODO: any other events?
    }



    send(msg: any) {
        if (this.state !== ST_INITED) {
            return;
        }
        if (typeof msg !== 'string') {
            msg = JSON.stringify(msg);
        }
        this.socket.send(msg);
    }
    sendRaw = this.send;
    disconnect() {
        if (this.state === ST_CLOSED) {
            return;
        }

        this.state = ST_CLOSED;
        this.socket.disconnect();
    }

    sendBatch(msgs: any[]) {
        this.send(encodeBatch(msgs));
    }
}

/**
 * Encode batch msg to client
 */
let encodeBatch = function (msgs: any[]) {
    let res = '[', msg;
    for (let i = 0, l = msgs.length; i < l; i++) {
        if (i > 0) {
            res += ',';
        }
        msg = msgs[i];
        if (typeof msg === 'string') {
            res += msg;
        } else {
            res += JSON.stringify(msg);
        }
    }
    res += ']';
    return res;
};
