import * as net from 'net';
import * as util from 'util';
import * as dgram from 'dgram';
import * as utils from '../util/utils';
import * as Constants from '../util/constants';
import {UdpSocket} from './udpsocket';
import * as Kick from './commands/kick';
import { HandshakeCommand, HandshakeCommandOptions } from './commands/handshake';
import { HeartbeatCommand, HeartbeatCommandOptions } from './commands/heartbeat';
import { Package, Message } from 'pinus-protocol';
import * as coder from './common/coder';
import { EventEmitter } from 'events';
import { getLogger } from 'pinus-logger';
import { SocketType } from 'dgram';
import { IConnector } from '../interfaces/IConnector';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));



export interface UDPConnectorOptions extends HandshakeCommandOptions , HeartbeatCommandOptions {
    udpType ?: 'udp4';
    heartbeat ?: number;
    timeout ?: number;
}


let curId = 1;

export class UDPConnector extends EventEmitter implements IConnector {
    opts: any;
    type: SocketType;
    handshake: HandshakeCommand;
    heartbeat: HeartbeatCommand;
    clients: { [key: string]: any };
    host: string;
    port: number;
    tcpServer: net.Server;
    socket: dgram.Socket;

    constructor(port: number, host: string, opts: UDPConnectorOptions) {
        super();
        this.opts = opts || {};
        this.type = opts.udpType || 'udp4';
        this.handshake = new HandshakeCommand(opts);
        if (!opts.heartbeat) {
            opts.heartbeat = Constants.TIME.DEFAULT_UDP_HEARTBEAT_TIME;
            opts.timeout = Constants.TIME.DEFAULT_UDP_HEARTBEAT_TIMEOUT;
        }
        this.heartbeat = new HeartbeatCommand(utils.extendsObject(opts, { disconnectOnTimeout: true }));
        this.clients = {};
        this.host = host;
        this.port = port;
    }

    start(cb: () => void) {
        let self = this;
        this.tcpServer = net.createServer();
        this.socket = dgram.createSocket(this.type, function (msg, peer) {
            let key = genKey(peer);
            if (!self.clients[key]) {
                let udpsocket = new UdpSocket(curId++, self.socket, peer);
                self.clients[key] = udpsocket;

                udpsocket.on('handshake',
                    self.handshake.handle.bind(self.handshake, udpsocket));

                udpsocket.on('heartbeat',
                    self.heartbeat.handle.bind(self.heartbeat, udpsocket));

                udpsocket.on('disconnect',
                    self.heartbeat.clear.bind(self.heartbeat, udpsocket.id));

                udpsocket.on('disconnect', function () {
                    delete self.clients[genKey(udpsocket.peer)];
                });

                udpsocket.on('closing', Kick.handle.bind(null, udpsocket));

                self.emit('connection', udpsocket);
            }
        });

        this.socket.on('message', function (data: Buffer, peer: dgram.RemoteInfo) {
            let socket = self.clients[genKey(peer)];
            if (!!socket) {
                socket.emit('package', data);
            }
        });

        this.socket.on('error', function (err: Error) {
            logger.error('udp socket encounters with error: %j', err.stack);
            return;
        });

        this.socket.bind(this.port, this.host);
        this.tcpServer.listen(this.port);
        process.nextTick(cb);
    }

    decode = coder.decode;

    encode = coder.encode;

    stop(force: boolean, cb: () => void) {
        this.socket.close();
        process.nextTick(cb);
    }
}

let genKey = function (peer: dgram.RemoteInfo) {
    return peer.address + ':' + peer.port;
};