import * as net from 'net';
import * as tls from 'tls';
import * as util from 'util';
import { EventEmitter } from 'events';

import { HybridSocket } from './hybridsocket';
import { HybridSwitcher as Switcher, HybridSwitcherOptions } from './hybrid/switcher';
import { HandshakeCommand } from './commands/handshake';
import { HeartbeatCommand } from './commands/heartbeat';
import * as Kick from './commands/kick';
import * as coder from './common/coder';
import { ConnectorComponent } from '../components/connector';
import { DictionaryComponent } from '../components/dictionary';
import { ProtobufComponent } from '../components/protobuf';
import { IComponent } from '../interfaces/IComponent';
import { pinus } from '../pinus';
import { IConnector } from '../interfaces/IConnector';
import { TlsOptions } from 'tls';
import * as WebSocket from 'ws';
import { TcpSocket } from './hybrid/tcpsocket';
import { IHybridSocket } from './hybrid/IHybridSocket';

let curId = 1;

export interface HybridConnectorOptions extends HybridSwitcherOptions {
    useDict ?: boolean;
    useProtobuf ?: boolean;
    distinctHost ?: boolean;
}

/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Develper can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
export class HybridConnector extends EventEmitter implements IConnector {
    opts: HybridConnectorOptions;
    port: number;
    host: string;
    useDict: boolean;
    useProtobuf: boolean;
    handshake: HandshakeCommand;
    heartbeat: HeartbeatCommand;
    distinctHost: boolean;
    ssl: tls.TlsOptions;
    switcher: Switcher;

    connector: IConnector;
    dictionary: DictionaryComponent;
    protobuf: ProtobufComponent;
    decodeIO_protobuf: IComponent;

    listeningServer: net.Server;

    constructor(port: number, host: string, opts ?: HybridConnectorOptions) {
        super();

        this.opts = opts || {};
        this.port = port;
        this.host = host;
        this.useDict = opts.useDict;
        this.useProtobuf = opts.useProtobuf;
        this.handshake = new HandshakeCommand(opts);
        this.heartbeat = new HeartbeatCommand(opts);
        this.distinctHost = opts.distinctHost;
        this.ssl = opts.ssl;

        this.switcher = null;
    }

    /**
     * Start connector to listen the specified port
     */
    start(cb: () => void) {
        let app = pinus.app;
        let self = this;

        let gensocket = function (socket: IHybridSocket) {
            let hybridsocket = new HybridSocket(curId++, socket);
            hybridsocket.on('handshake', self.handshake.handle.bind(self.handshake, hybridsocket));
            hybridsocket.on('heartbeat', self.heartbeat.handle.bind(self.heartbeat, hybridsocket));
            hybridsocket.on('disconnect', self.heartbeat.clear.bind(self.heartbeat, hybridsocket.id));
            hybridsocket.on('closing', Kick.handle.bind(null, hybridsocket));
            self.emit('connection', hybridsocket);
        };

        this.connector = app.components.__connector__.connector;
        this.dictionary = app.components.__dictionary__;
        this.protobuf = app.components.__protobuf__;
        this.decodeIO_protobuf = app.components.__decodeIO__protobuf__;

        if (!this.ssl) {
            this.listeningServer = net.createServer();
        } else {
            this.listeningServer = tls.createServer(this.ssl);
        }
        this.switcher = new Switcher(this.listeningServer, self.opts);

        this.switcher.on('connection', function (socket) {
            gensocket(socket);
        });

        if (!!this.distinctHost) {
            this.listeningServer.listen(this.port, this.host);
        } else {
            this.listeningServer.listen(this.port);
        }

        process.nextTick(cb);
    }

    stop(force: boolean, cb: () => void) {
        this.switcher.close();
        this.listeningServer.close();

        process.nextTick(cb);
    }
    decode = coder.decode;

    encode = coder.encode;

}