import * as util from 'util';
import { default as handler } from './common/handler';
import { Package } from 'pinus-protocol';
import * as EventEmitter from 'events';
import { getLogger } from 'pinus-logger';
import { ISocket } from '../interfaces/ISocket';
import * as dgram from 'dgram';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


let ST_INITED = 0;
let ST_WAIT_ACK = 1;
let ST_WORKING = 2;
let ST_CLOSED = 3;

export class UdpSocket extends EventEmitter implements ISocket {
    id: number;
    socket: dgram.Socket;
    peer: dgram.RemoteInfo;
    host: string;
    port: number;
    remoteAddress: { ip: string; port: number };
    state: number;

    constructor(id: number, socket: dgram.Socket, peer: dgram.RemoteInfo) {
        super();
        this.id = id;
        this.socket = socket;
        this.peer = peer;
        this.host = peer.address;
        this.port = peer.port;
        this.remoteAddress = {
            ip: this.host,
            port: this.port
        };

        let self = this;
        this.on('package', function (pkg) {
            if (!!pkg) {
                pkg = Package.decode(pkg);
                handler(self, pkg);
            }
        });

        this.state = ST_INITED;
    }


    /**
     * Send byte data package to client.
     *
     * @param  {Buffer} msg byte data
     */
    send(msg: any) {
        if (this.state !== ST_WORKING) {
            return;
        }
        if (msg instanceof String) {
            msg = new Buffer(msg as string);
        } else if (!(msg instanceof Buffer)) {
            msg = new Buffer(JSON.stringify(msg));
        }
        this.sendRaw(Package.encode(Package.TYPE_DATA, msg));
    }

    sendRaw(msg: any) {
        this.socket.send(msg, 0, msg.length, this.port, this.host, function (err, bytes) {
            if (!!err) {
                logger.error('send msg to remote with err: %j', err.stack);
                return;
            }
        });
    }

    sendForce(msg: any) {
        if (this.state === ST_CLOSED) {
            return;
        }
        this.sendRaw(msg);
    }

    handshakeResponse(resp: any) {
        if (this.state !== ST_INITED) {
            return;
        }
        this.sendRaw(resp);
        this.state = ST_WAIT_ACK;
    }

    sendBatch(msgs: any[]) {
        if (this.state !== ST_WORKING) {
            return;
        }
        let rs = [];
        for (let i = 0; i < msgs.length; i++) {
            let src = Package.encode(Package.TYPE_DATA, msgs[i]);
            rs.push(src);
        }
        this.sendRaw(Buffer.concat(rs));
    }

    disconnect() {
        if (this.state === ST_CLOSED) {
            return;
        }
        this.state = ST_CLOSED;
        this.emit('disconnect', 'the connection is disconnected.');
    }
}