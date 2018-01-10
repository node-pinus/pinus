import * as util from 'util';
import * as net from 'net';
import { EventEmitter } from 'events';
import {default as  handler } from './common/handler';
import { Package} from 'pinus-protocol';
import { getLogger } from 'pinus-logger';
import { ISocket } from '../interfaces/ISocket';
import * as WebSocket from 'ws';
import { TcpSocket } from './hybrid/tcpsocket';
import { IHybridSocket } from './hybrid/IHybridSocket';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


let ST_INITED = 0;
let ST_WAIT_ACK = 1;
let ST_WORKING = 2;
let ST_CLOSED = 3;

/**
 * Socket class that wraps socket and websocket to provide unified interface for up level.
 */
export class HybridSocket extends EventEmitter implements ISocket {
    id: number;
    socket: IHybridSocket;
    remoteAddress: { ip: string, port: number };
    state: number;

    constructor(id: number, socket: IHybridSocket) {
        super();
        this.id = id;
        this.socket = socket;

        if (!(socket as TcpSocket)._socket) {
            this.remoteAddress = {
                ip: (socket as any).address().address,
                port: (socket as any).address().port
            };
        } else {
            this.remoteAddress = {
                ip: (socket as TcpSocket)._socket.remoteAddress,
                port: (socket as TcpSocket)._socket.remotePort
            };
        }

        let self = this;

        socket.once('close', this.emit.bind(this, 'disconnect'));
        socket.on('error', this.emit.bind(this, 'error'));

        socket.on('message', function (msg) {
            if (msg) {
                msg = Package.decode(msg);
                handler(self, msg);
            }
        });

        this.state = ST_INITED;

        // TODO: any other events?
    }


    /**
     * Send raw byte data.
     *
     * @api private
     */
    sendRaw(msg: any) {
        if (this.state !== ST_WORKING) {
            return;
        }
        let self = this;

        this.socket.send(msg, { binary: true },  (err) => {
            if (!!err) {
                logger.error('websocket send binary data failed: %j', err.stack);
                return;
            }
        });
    }

    /**
     * Send byte data package to client.
     *
     * @param  {Buffer} msg byte data
     */
    send(msg: any) {
        if (msg instanceof String) {
            msg = new Buffer(msg as string);
        } else if (!(msg instanceof Buffer)) {
            msg = new Buffer(JSON.stringify(msg));
        }
        this.sendRaw(Package.encode(Package.TYPE_DATA, msg));
    }

    /**
     * Send byte data packages to client in batch.
     *
     * @param  {Buffer} msgs byte data
     */
    sendBatch(msgs: any[]) {
        let rs = [];
        for (let i = 0; i < msgs.length; i++) {
            let src = Package.encode(Package.TYPE_DATA, msgs[i]);
            rs.push(src);
        }
        this.sendRaw(Buffer.concat(rs));
    }

    /**
     * Send message to client no matter whether handshake.
     *
     * @api private
     */
    sendForce(msg: any) {
        if (this.state === ST_CLOSED) {
            return;
        }
        this.socket.send(msg, { binary: true });
    }

    /**
     * Response handshake request
     *
     * @api private
     */
    handshakeResponse(resp: any) {
        if (this.state !== ST_INITED) {
            return;
        }

        this.socket.send(resp, { binary: true });
        this.state = ST_WAIT_ACK;
    }

    /**
     * Close the connection.
     *
     * @api private
     */
    disconnect() {
        if (this.state === ST_CLOSED) {
            return;
        }

        this.state = ST_CLOSED;
        this.socket.emit('close');
        this.socket.close();
    }
}