import * as WebSocket from 'ws';
import {Package, Message, Protocol} from 'pinus-protocol';
import {Protobuf} from 'pinus-protobuf';
import {EventEmitter} from 'events';
import {cacheClass} from "./cacheClass";
import { MyLogger } from "./my.logger";

const JS_WS_CLIENT_TYPE = 'js-ws';
const JS_WS_CLIENT_VERSION = '0.0.1';

const RES_OK = 200;
const RES_OLD_CLIENT = 501;
const CODE_DICT_ERROR = 502;
const CODE_PROTOS_ERROR = 503;

export interface IPomeloInterface {
    on(event: 'close', cb): any;

    on(event: 'io-error', cb): any;

    on(event: 'error', cb): any;

    on(event: 'heartbeat timeout', cb): any;

    on(event: 'onKick', cb): any;

    initAsync(params): Promise<any>;

    init(params, cb);

    disconnect();

    request(route, msg): Promise<any>;

    notify(route, msg);
}

export class Pomelo extends EventEmitter implements IPomeloInterface {
    socket = null;
    reqId = 0;
    callbacks = {};
    handlers = {};
    routeMap = {};
    protobuf: Protobuf = null;
    heartbeatInterval = 5000;
    heartbeatTimeout = this.heartbeatInterval * 2;
    nextHeartbeatTimeout = 0;
    gapThreshold = 100; // heartbeat gap threshold
    heartbeatId = null;
    heartbeatTimeoutId = null;

    handshakeCallback = null;
    logger: MyLogger;

    handshakeBuffer = {
        'sys': {
            type: JS_WS_CLIENT_TYPE,
            version: JS_WS_CLIENT_VERSION,
            dictVersion: '' as any,
            protoVersion: '' as any
        },
        'user': {}
    };

    initCallback = null;

    params = null;


    data: { dict: any, abbrs: any, protos: any } = {} as any;

    sysCache: { dictVersion: string, protoVersion: string, dict: any, protos: any } = null;
    static ClientId = 0;

    constructor(useNestLogger = true, private readonly showPackageLog: boolean = true) {
        super();
        this.handlers[Package.TYPE_HANDSHAKE] = this.handshake.bind(this);
        this.handlers[Package.TYPE_HEARTBEAT] = this.heartbeat.bind(this);
        this.handlers[Package.TYPE_DATA] = this.onData.bind(this);
        this.handlers[Package.TYPE_KICK] = this.onKick.bind(this);
        if (useNestLogger) {
            this.logger = new MyLogger('wsclient-' + ++Pomelo.ClientId);
        } else {
            this.logger = console as any;
        }

    }

    initAsync(params): Promise<any> {
        return new Promise(resolve => {
            this.params = params;
            params.debug = true;
            this.initCallback = resolve;
            const host = params.host;
            const port = params.port;

            let url = host;
            if (port) {
                url += ':' + port;
            }
            this.sysCache = cacheClass.getCache() || {} as any;
            this.handshakeBuffer.sys.dictVersion = this.sysCache.dictVersion || 0;
            this.handshakeBuffer.sys.protoVersion = this.sysCache.protoVersion || 0;

            if (!params.type) {
                this.logger.log('init websocket');
                this.handshakeBuffer.user = params.user;
                this.handshakeCallback = params.handshakeCallback;
                this.initWebSocket(url, resolve);
            }
        })
    }

    init(params, cb) {
        this.params = params;
        params.debug = true;
        this.initCallback = cb;
        const host = params.host;
        const port = params.port;

        let url = 'ws://' + host;
        if (port) {
            url += ':' + port;
        }
        this.sysCache = cacheClass.getCache() || {} as any;
        this.handshakeBuffer.sys.dictVersion = this.sysCache.dictVersion || 0;
        this.handshakeBuffer.sys.protoVersion = this.sysCache.protoVersion || 0;

        if (!params.type) {
            this.logger.log('init websocket');
            this.handshakeBuffer.user = params.user;
            this.handshakeCallback = params.handshakeCallback;
            this.initWebSocket(url, cb);
        }

    };

    private initWebSocket(url, cb) {
        this.logger.log(url);
        const onopen = (event) => {
            this.logger.log('[pomeloclient.init] websocket connected!');
            const obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer)));
            this.send(obj);
        };
        const onmessage = (event) => {
            if (this.showPackageLog && event.data.byteLength != 4) {
                this.logger.log('recv orgdata', event.data.byteLength, Buffer.from(event.data).toString('hex'));
            }
            this.processPackage(Package.decode(event.data));//, cb);
            // new package arrived, update the heartbeat timeout
            if (this.heartbeatTimeout) {
                this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout;
            }
        };
        const onerror = (event) => {
            this.emit('io-error', event);
            this.logger.log('socket error %j ', event);
        };
        const onclose = (event) => {
            this.emit('close', event);
            this.logger.log('socket close %j ', event);
        };
        this.socket = new WebSocket(url);
        this.socket.binaryType = 'arraybuffer';
        this.socket.onopen = onopen;
        this.socket.onmessage = onmessage;
        this.socket.onerror = onerror;
        this.socket.onclose = onclose;
    };

    disconnect() {
        if (this.socket) {
            if (this.socket.disconnect) this.socket.disconnect();
            if (this.socket.close) this.socket.close();
            this.logger.log('disconnect');
            this.socket = null;
        }

        if (this.heartbeatId) {
            clearTimeout(this.heartbeatId);
            this.heartbeatId = null;
        }
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }
    };

    request(route, msg): Promise<any> {
        return new Promise((resolve, reject) => {
            msg = msg || {};
            route = route || msg.route;
            if (!route) {
                this.logger.log('fail to send request without route.');
                return;
            }

            this.reqId++;
            this.sendMessage(this.reqId, route, msg);

            this.callbacks[this.reqId] = resolve;
            this.routeMap[this.reqId] = route;
        })
    };

    notify(route, msg) {
        msg = msg || {};
        this.sendMessage(0, route, msg);
    };

    private sendMessage(reqId, route, msg) {
        const type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;
        if (this.showPackageLog) {
            this.logger.log('send', reqId, route, msg);
        }
        //compress message by protobuf
        const protos = !!this.data.protos ? this.data.protos.client : {};
        if (!!protos[route]) {
            msg = this.protobuf.encode(route, msg);
        } else {
            msg = Protocol.strencode(JSON.stringify(msg));
        }

        let compressRoute = false;
        if (this.data.dict && this.data.dict[route]) {
            route = this.data.dict[route];
            compressRoute = true;
        }

        msg = Message.encode(reqId, type, compressRoute, route, msg);
        const packet = Package.encode(Package.TYPE_DATA, msg);
        if (this.showPackageLog) {
            this.logger.log('send', "packet", packet.length, packet.toString('hex'));
        }
        this.send(packet);
    };

    private send(packet) {
        if (!!this.socket) {
            this.socket.send(packet.buffer || packet, {binary: true, mask: true});
        }
    };

    private heartbeat(data) {
        const obj = Package.encode(Package.TYPE_HEARTBEAT);
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }

        if (this.heartbeatId) {
            // already in a heartbeat interval
            return;
        }

        this.heartbeatId = setTimeout(() => {
            this.heartbeatId = null;
            this.send(obj);

            this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout;
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this), this.heartbeatTimeout);
        }, this.heartbeatInterval);
    };

    private heartbeatTimeoutCb() {
        const gap = this.nextHeartbeatTimeout - Date.now();
        if (gap > this.gapThreshold) {
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this), gap);
        } else {
            this.logger.error('server heartbeat timeout');
            this.emit('heartbeat timeout');
            this.disconnect();
        }
    };

    private handshake(data) {
        data = JSON.parse(Protocol.strdecode(data));
        if (data.code === RES_OLD_CLIENT) {
            this.emit('error', 'client version not fullfill');
            return;
        }

        if (data.code !== RES_OK) {
            this.emit('error', 'handshake fail');
            return;
        }

        this.handshakeInit(data);

        const obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);
        this.send(obj);
        if (this.initCallback) {
            this.initCallback(this.socket);
            this.initCallback = null;
        }
    };

    private onData(data) {
        //probuff decode
        const msg = Message.decode(data);

        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id];
            delete this.routeMap[msg.id];
            if (!msg.route) {
                return;
            }
        }

        msg.body = this.deCompose(msg);
        if (this.showPackageLog) {
            this.logger.log('recv', JSON.stringify(msg), "\n\tpacket", data.length, data.toString('hex'));
        }
        this.processMessage(msg);
    };


    private onKick(data) {
        this.emit('onKick', data.toString());
    };

    private processPackage(msg) {
        if (Array.isArray(msg)) {
            for (let m of msg) {
                this.handlers[m.type](m.body);
            }
        } else {
            this.handlers[msg.type](msg.body);
        }

    };

    private processMessage(msg) {
        if (!msg || !msg.id) {
            // server push message
            // this.logger.error('processMessage error!!!');
            this.emit(msg.route, msg.body);
            return;
        }

        //if have a id then find the callback function with the request
        const cb = this.callbacks[msg.id];

        delete this.callbacks[msg.id];
        if (typeof cb !== 'function') {
            return;
        }

        cb(msg.body);
        return;
    };

    private processMessageBatch(pomelo, msgs) {
        for (let i = 0, l = msgs.length; i < l; i++) {
            this.processMessage(msgs[i]);
        }
    };

    private deCompose(msg) {
        const protos = !!this.data.protos ? this.data.protos.server : {};
        const abbrs = this.data.abbrs;
        let route = msg.route;

        try {
            //Decompose route from dict
            if (msg.compressRoute) {
                if (!abbrs[route]) {
                    this.logger.error('illegal msg!');
                    return {};
                }

                route = msg.route = abbrs[route];
            }
            if (!!protos[route]) {
                return this.protobuf.decode(route, msg.body);
            } else {
                return JSON.parse(Protocol.strdecode(msg.body));
            }
        } catch (ex) {
            this.logger.error('route, body = ' + route + ", " + msg.body);
        }

        return msg;
    };

    private handshakeInit(data) {
        if (data.sys && data.sys.heartbeat) {
            this.heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
            this.heartbeatTimeout = this.heartbeatInterval * 2;        // max heartbeat timeout
        } else {
            this.heartbeatInterval = 0;
            this.heartbeatTimeout = 0;
        }

        this.initData(data);

        if (typeof this.handshakeCallback === 'function') {
            this.handshakeCallback(data.user);
        }
    };

    //Initilize data used in pomelo client
    private initData(data) {
        if (!data || !data.sys) {
            return;
        }

        const dictVersion = data.sys.dictVersion;
        const protoVersion = data.sys.protos ? data.sys.protos.version : null;

        let changed = false;
        const dict = data.sys.dict || this.sysCache.dict;
        const protos = data.sys.protos || this.sysCache.protos;

        if (dictVersion) {
            this.sysCache.dict = dict;
            this.sysCache.dictVersion = dictVersion;
            changed = true;
        }

        if (protoVersion) {
            this.sysCache.protos = protos;
            this.sysCache.protoVersion = protoVersion;
            changed = true;
        }
        if (changed) {
            cacheClass.saveCache(this.sysCache);
        }
        //Init compress dict
        if (!!dict) {
            this.data.dict = dict;
            this.data.abbrs = {};

            for (const route in dict) {
                this.data.abbrs[dict[route]] = route;
            }
        }

        //Init protobuf protos
        if (!!protos) {
            this.data.protos = {
                server: protos.server || {},
                client: protos.client || {}
            };
            if (!this.protobuf) {
                // 要改WEB JS客户端的话 这里可能需要改一下。
                this.protobuf = new Protobuf({encoderProtos: protos.client, decoderProtos: protos.server});
            }
        }
    };
}
























