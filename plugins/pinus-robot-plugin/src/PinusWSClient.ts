
import * as egret from './ByteArray';
import * as WebSocket from 'ws';

export enum PinusWSClientEvent {
     EVENT_IO_ERROR = 'io-error',
     EVENT_CLOSE = 'close',
     EVENT_KICK = 'onKick',
     EVENT_HEART_BEAT_TIMEOUT = 'heartbeat timeout'
}

export class PinusWSClient {

    static DEBUG: boolean = false;

    private JS_WS_CLIENT_TYPE = 'js-websocket';
    private JS_WS_CLIENT_VERSION = '0.0.5';

    private RES_OK: number = 200;
    private RES_FAIL: number = 500;
    private RES_OLD_CLIENT: number = 501;


    private socket: WebSocket = null;
    private callbacks: any = {};
    private handlers: any = {};
    // Map from request id to route
    private routeMap: any = {};

    private heartbeatInterval: number = 0;
    private heartbeatTimeout: number = 0;
    private nextHeartbeatTimeout: number = 0;
    private gapThreshold: number = 100;
    private heartbeatId: any = null;
    private heartbeatTimeoutId: any = null;

    private handshakeCallback: any = null;
    private handshakeBuffer: any;
    private initCallback: Function = null;

    private _callbacks: any = {};

    private reqId: number = 0;


    private _package: IPackage;
    private _message: IMessage;

    constructor() {

        this.socket = null;
        this.callbacks = {};
        this.handlers = {};
        // Map from request id to route
        this.routeMap = {};
        this._message = new Message(this.routeMap);
        this._package = new Package();


        this.heartbeatInterval = 0;
        this.heartbeatTimeout = 0;
        this.nextHeartbeatTimeout = 0;
        this.gapThreshold = 100;
        this.heartbeatId = null;
        this.heartbeatTimeoutId = null;

        this.handshakeCallback = null;

        this.handshakeBuffer = {
            'sys': {
                type: this.JS_WS_CLIENT_TYPE,
                version: this.JS_WS_CLIENT_VERSION
            },
            'user': {
            }
        };

        this.initCallback = null;

        this.reqId = 0;

        this.handlers[Package.TYPE_HANDSHAKE] = this.handshake;
        this.handlers[Package.TYPE_HEARTBEAT] = this.heartbeat;
        this.handlers[Package.TYPE_DATA] = this.onData;
        this.handlers[Package.TYPE_KICK] = this.onKick;
    }


    public init(params: any, cb: Function): void {
        console.log('init', params);
        this.initCallback = cb;
        let host = params.host;
        let port = params.port;
        //
        // var url = 'ws://' + host;
        // if(port) {
        //    url +=  ':' + port;
        // }

        this.handshakeBuffer.user = params.user;
        this.handshakeCallback = params.handshakeCallback;
        this.initWebSocket(host, port, cb);
    }
    private initWebSocket(host: string, port: number, cb: Function): void {
        console.log('[Pinus] connect to:', host, port);

        let url = 'ws://' + host;
        if (port) {
            url += ':' + port;
        }
        let socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        socket.onopen = (event) => {
            this.onConnect();
        };
        socket.onmessage = (event) => {
            this.onMessage(event);
        };
        socket.onerror = (event) => {
            this.onIOError(event);
        };
        socket.onclose = (event) => {
            this.onClose(event);
        };
        this.socket = socket;
    }


    public on(event: PinusWSClientEvent.EVENT_IO_ERROR, fn: (err: Error) => void): void;
    public on(event: PinusWSClientEvent.EVENT_CLOSE, fn: (err: Error) => void): void;
    public on(event: PinusWSClientEvent.EVENT_KICK, fn: (err: Error) => void): void;
    public on(event: PinusWSClientEvent.EVENT_HEART_BEAT_TIMEOUT, fn: (err: Error) => void): void;
    public on(event: string, fn: (msg: any) => void) {
        (this._callbacks[event] = this._callbacks[event] || []).push(fn);
    }
    public request(route: string, msg: any, cb: Function) {
        if (arguments.length === 2 && typeof msg === 'function') {
            cb = msg;
            msg = {};
        } else {
            msg = msg || {};
        }
        route = route || msg.route;
        if (!route) {
            return;
        }

        this.reqId++;
        if (this.reqId > 127) {
            this.reqId = 1;
        }
        let reqId = this.reqId;


        if (PinusWSClient.DEBUG) {
            console.log(`REQUEST:route:${route} , reqId:${reqId}, msg:${msg}`);
        }

        this.sendMessage(reqId, route, msg);

        this.callbacks[reqId] = cb;
        this.routeMap[reqId] = route;
    }

    public notify(route: string, msg: any): void {
        this.sendMessage(0, route, msg);
    }

    private onMessage(event: { data: string | Buffer | ArrayBuffer | Buffer[]; type: string; target: WebSocket }): void {
        this.processPackage(this._package.decode(new egret.ByteArray(<ArrayBuffer>event.data)));

    }
    private sendMessage(reqId: number, route: string, msg: any) {
        let byte: egret.ByteArray;

        byte = this._message.encode(reqId, route, msg);
        byte = this._package.encode(Package.TYPE_DATA, byte);

        this.send(byte);

    }

    private onConnect(): void {
        console.log('[Pinus] connect success');
        this.send(this._package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer))));
    }

    private onClose(e: any): void {
        console.error('[Pinus] connect close:', e);
        // this.emit(Pinus.EVENT_CLOSE,e);
    }

    private onIOError(e: any): void {
        // this.emit(Pinus.EVENT_IO_ERROR, e);
        console.error('socket error: ', e);
    }

    private onKick(event: string) {
        // this.emit(PinusWSClient.EVENT_KICK,event);
    }
    private onData(data: any) {
        // probuff decode
        let msg = this._message.decode(data);

        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id];
            delete this.routeMap[msg.id];
            if (!msg.route) {
                return;
            }
        }

        // msg.body = this.deCompose(msg);

        this.processMessage(msg);

    }

    private processMessage(msg: any) {
        if (!msg.id) {
            // server push message

            if (PinusWSClient.DEBUG) {
                console.log(`EVENT: Route:${msg.route} Msg:${msg.body}`);
            }

            // this.emit(msg.route, msg.body);
            return;
        }
        if (PinusWSClient.DEBUG) {
            console.log(`RESPONSE: Id:${msg.id} Msg:${msg.body}`);
        }

        // if have a id then find the callback function with the request
        let cb = this.callbacks[msg.id];

        delete this.callbacks[msg.id];
        if (typeof cb !== 'function') {
            return;
        }
        if (msg.body && msg.body.code === 500) {
            let obj: any = { 'code': 500, 'desc': '服务器内部错误', 'key': 'INTERNAL_ERROR' };
            msg.body.error = obj;
        }
        cb(msg.body);
        return;
    }

    private heartbeat(data: any) {

        if (!this.heartbeatInterval) {
            // no heartbeat
            return;
        }

        let obj = this._package.encode(Package.TYPE_HEARTBEAT);
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }

        if (this.heartbeatId) {
            // already in a heartbeat interval
            return;
        }

        let self = this;
        self.heartbeatId = setTimeout(function () {
            self.heartbeatId = null;
            self.send(obj);

            self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout;
            self.heartbeatTimeoutId = setTimeout(self.heartbeatTimeoutCb.bind(self, data), self.heartbeatTimeout);
        }, self.heartbeatInterval);
    }
    private heartbeatTimeoutCb(data: any) {
        let gap = this.nextHeartbeatTimeout - Date.now();
        if (gap > this.gapThreshold) {
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this, data), gap);
        } else {
            console.error('server heartbeat timeout', data);
            // this.emit(PinusWSClient.EVENT_HEART_BEAT_TIMEOUT,data);
            this._disconnect();
        }
    }
    public off(event?: string, fn?: Function) {
        this.removeAllListeners(event, fn);
    }
    public removeAllListeners(event?: string, fn?: Function) {
        // all
        if (0 === arguments.length) {
            this._callbacks = {};
            return;
        }

        // specific event
        let callbacks = this._callbacks[event];
        if (!callbacks) {
            return;
        }

        // remove all handlers
        if (event && !fn) {
            delete this._callbacks[event];
            return;
        }

        // remove specific handler
        let i = this.index(callbacks, (fn as any)._off || fn);
        if (~i) {
            callbacks.splice(i, 1);
        }
        return;
    }
    private index(arr: any, obj: any) {
        if ([].indexOf) {
            return arr.indexOf(obj);
        }

        for (let i = 0; i < arr.length; ++i) {
            if (arr[i] === obj)
                return i;
        }
        return -1;
    }
    public disconnect(): void {
        this._disconnect();
    }
    private _disconnect(): void {
        console.warn('[Pinus] client disconnect ...');

        if (this.socket) this.socket.close();
        this.socket = null;
        if (this.heartbeatId) {
            clearTimeout(this.heartbeatId);
            this.heartbeatId = null;
        }

        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }

    }
    private processPackage(msg: any): void {
        this.handlers[msg.type].apply(this, [msg.body]);
    }
    private handshake(resData: any) {

        let data = JSON.parse(Protocol.strdecode(resData));
        if (data.code === this.RES_OLD_CLIENT) {
            // this.emit(PinusWSClient.EVENT_IO_ERROR, 'client version not fullfill');
            return;
        }

        if (data.code !== this.RES_OK) {
            // this.emit(PinusWSClient.EVENT_IO_ERROR, 'handshake fail');
            return;
        }

        this.handshakeInit(data);

        let obj = this._package.encode(Package.TYPE_HANDSHAKE_ACK);
        this.send(obj);
        if (this.initCallback) {
            this.initCallback(data);
            this.initCallback = null;
        }
    }
    private handshakeInit(data: any): void {

        if (data.sys) {
            Routedic.init(data.sys.dict);
            Protobuf.init(data.sys.protos);
        }
        if (data.sys && data.sys.heartbeat) {
            this.heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
            this.heartbeatTimeout = this.heartbeatInterval * 2;        // max heartbeat timeout
        } else {
            this.heartbeatInterval = 0;
            this.heartbeatTimeout = 0;
        }

        if (typeof this.handshakeCallback === 'function') {
            this.handshakeCallback(data.user);
        }
    }
    private send(byte: egret.ByteArray): void {
        if (this.socket) {
            this.socket.send(byte.buffer);
        }
    }
    //  private deCompose(msg){
    //    return JSON.parse(Protocol.strdecode(msg.body));
    // }
    private emit(event: string, ...args: any[]) {
        let params = [].slice.call(arguments, 1);
        let callbacks = this._callbacks[event];

        if (callbacks) {
            callbacks = callbacks.slice(0);
            for (let i = 0, len = callbacks.length; i < len; ++i) {
                callbacks[i].apply(this, params);
            }
        }

        return this;
    }


}

class Package implements IPackage {
    static TYPE_HANDSHAKE: number = 1;
    static TYPE_HANDSHAKE_ACK: number = 2;
    static TYPE_HEARTBEAT: number = 3;
    static TYPE_DATA: number = 4;
    static TYPE_KICK: number = 5;

    public encode(type: number, body?: egret.ByteArray) {
        let length: number = body ? body.length : 0;

        let buffer: egret.ByteArray = new egret.ByteArray();
        buffer.writeByte(type & 0xff);
        buffer.writeByte((length >> 16) & 0xff);
        buffer.writeByte((length >> 8) & 0xff);
        buffer.writeByte(length & 0xff);

        if (body) buffer.writeBytes(body, 0, body.length);

        return buffer;
    }
    public decode(buffer: egret.ByteArray) {

        let type: number = buffer.readUnsignedByte();
        let len: number = (buffer.readUnsignedByte() << 16 | buffer.readUnsignedByte() << 8 | buffer.readUnsignedByte()) >>> 0;

        let body: egret.ByteArray;

        if (buffer.bytesAvailable >= len) {
            body = new egret.ByteArray();
            if (len) buffer.readBytes(body, 0, len);
        }
        else {
            console.log('[Package] no enough length for current type:', type);
        }

        return { type: type, body: body, length: len };
    }
}

class Message implements IMessage {

    public static MSG_FLAG_BYTES: number = 1;
    public static MSG_ROUTE_CODE_BYTES: number = 2;
    public static MSG_ID_MAX_BYTES: number = 5;
    public static MSG_ROUTE_LEN_BYTES: number = 1;

    public static MSG_ROUTE_CODE_MAX: number = 0xffff;

    public static MSG_COMPRESS_ROUTE_MASK: number = 0x1;
    public static MSG_TYPE_MASK: number = 0x7;

    static TYPE_REQUEST: number = 0;
    static TYPE_NOTIFY: number = 1;
    static TYPE_RESPONSE: number = 2;
    static TYPE_PUSH: number = 3;

    constructor(private routeMap: any) {

    }

    public encode(id: number, route: string, msg: any) {
        let buffer: egret.ByteArray = new egret.ByteArray();

        let type: number = id ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

        let byte: egret.ByteArray = Protobuf.encode(route, msg) || Protocol.strencode(JSON.stringify(msg));

        let rot: any = Routedic.getID(route) || route;

        buffer.writeByte((type << 1) | ((typeof (rot) === 'string') ? 0 : 1));

        if (id) {
            // 7.x
            do {
                let tmp: number = id % 128;
                let next: number = Math.floor(id / 128);

                if (next !== 0) {
                    tmp = tmp + 128;
                }

                buffer.writeByte(tmp);

                id = next;
            } while (id !== 0);

            // 5.x
            //                var len:Array = [];
            //                len.push(id & 0x7f);
            //                id >>= 7;
            //                while(id > 0)
            //                {
            //                    len.push(id & 0x7f | 0x80);
            //                    id >>= 7;
            //                }
            //
            //                for (var i:int = len.length - 1; i >= 0; i--)
            //                {
            //                    buffer.writeByte(len[i]);
            //                }
        }

        if (rot) {
            if (typeof rot === 'string') {
                buffer.writeByte(rot.length & 0xff);
                buffer.writeUTFBytes(rot);
            }
            else {
                buffer.writeByte((rot >> 8) & 0xff);
                buffer.writeByte(rot & 0xff);
            }
        }

        if (byte) {
            buffer.writeBytes(byte);
        }

        return buffer;
    }

    public decode(buffer: egret.ByteArray): any {
        // parse flag
        let flag: number = buffer.readUnsignedByte();
        let compressRoute: number = flag & Message.MSG_COMPRESS_ROUTE_MASK;
        let type: number = (flag >> 1) & Message.MSG_TYPE_MASK;
        let route: any;

        // parse id
        let id: number = 0;
        if (type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE) {
            // 7.x
            let i: number = 0;
            let m: number;
            do {
                m = buffer.readUnsignedByte();
                id = id + ((m & 0x7f) * Math.pow(2, (7 * i)));
                i++;
            } while (m >= 128);

            // 5.x
            //                var byte:int = buffer.readUnsignedByte();
            //                id = byte & 0x7f;
            //                while(byte & 0x80)
            //                {
            //                    id <<= 7;
            //                    byte = buffer.readUnsignedByte();
            //                    id |= byte & 0x7f;
            //                }
        }

        // parse route
        if (type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY || type === Message.TYPE_PUSH) {

            if (compressRoute) {
                route = buffer.readUnsignedShort();
            }
            else {
                let routeLen: number = buffer.readUnsignedByte();
                route = routeLen ? buffer.readUTFBytes(routeLen) : '';
            }
        }
        else if (type === Message.TYPE_RESPONSE) {
            route = this.routeMap[id];
        }

        if (!id && !(typeof (route) === 'string')) {
            route = Routedic.getName(route);
        }

        let body: any = Protobuf.decode(route, buffer) || JSON.parse(Protocol.strdecode(buffer));

        return { id: id, type: type, route: route, body: body };
    }

}
class Protocol {

    public static strencode(str: string): egret.ByteArray {
        let buffer: egret.ByteArray = new egret.ByteArray();
        buffer.length = str.length;
        buffer.writeUTFBytes(str);
        return buffer;
    }

    public static strdecode(byte: egret.ByteArray): string {
        return byte.readUTFBytes(byte.bytesAvailable);
    }
}
class Protobuf {
    static TYPES: any = {
        uInt32: 0,
        sInt32: 0,
        int32: 0,
        double: 1,
        string: 2,
        message: 2,
        float: 5
    };
    private static _clients: any = {};
    private static _servers: any = {};

    static init(protos: any): void {
        this._clients = protos && protos.client || {};
        this._servers = protos && protos.server || {};
    }

    static encode(route: string, msg: any): egret.ByteArray {

        let protos: any = this._clients[route];

        if (!protos) return null;

        return this.encodeProtos(protos, msg);
    }

    static decode(route: string, buffer: egret.ByteArray): any {

        let protos: any = this._servers[route];

        if (!protos) return null;

        return this.decodeProtos(protos, buffer);
    }
    private static encodeProtos(protos: any, msg: any): egret.ByteArray {
        let buffer: egret.ByteArray = new egret.ByteArray();

        for (let name in msg) {
            if (protos[name]) {
                let proto: any = protos[name];

                switch (proto.option) {
                    case 'optional':
                    case 'required':
                        buffer.writeBytes(this.encodeTag(proto.type, proto.tag));
                        this.encodeProp(msg[name], proto.type, protos, buffer);
                        break;
                    case 'repeated':
                        if (!!msg[name] && msg[name].length > 0) {
                            this.encodeArray(msg[name], proto, protos, buffer);
                        }
                        break;
                }
            }
        }

        return buffer;
    }
    static decodeProtos(protos: any, buffer: egret.ByteArray): any {
        let msg: any = {};

        while (buffer.bytesAvailable) {
            let head: any = this.getHead(buffer);
            let name: string = protos.__tags[head.tag];

            switch (protos[name].option) {
                case 'optional':
                case 'required':
                    msg[name] = this.decodeProp(protos[name].type, protos, buffer);
                    break;
                case 'repeated':
                    if (!msg[name]) {
                        msg[name] = [];
                    }
                    this.decodeArray(msg[name], protos[name].type, protos, buffer);
                    break;
            }
        }

        return msg;
    }

    static encodeTag(type: number, tag: number): egret.ByteArray {
        let value: number = this.TYPES[type] !== undefined ? this.TYPES[type] : 2;

        return this.encodeUInt32((tag << 3) | value);
    }
    static getHead(buffer: egret.ByteArray): any {
        let tag: number = this.decodeUInt32(buffer);

        return { type: tag & 0x7, tag: tag >> 3 };
    }
    static encodeProp(value: any, type: string, protos: any, buffer: egret.ByteArray): void {
        switch (type) {
            case 'uInt32':
                buffer.writeBytes(this.encodeUInt32(value));
                break;
            case 'int32':
            case 'sInt32':
                buffer.writeBytes(this.encodeSInt32(value));
                break;
            case 'float':
                // Float32Array
                let floats: egret.ByteArray = new egret.ByteArray();
                floats.endian = egret.Endian.LITTLE_ENDIAN;
                floats.writeFloat(value);
                buffer.writeBytes(floats);
                break;
            case 'double':
                let doubles: egret.ByteArray = new egret.ByteArray();
                doubles.endian = egret.Endian.LITTLE_ENDIAN;
                doubles.writeDouble(value);
                buffer.writeBytes(doubles);
                break;
            case 'string':
                buffer.writeBytes(this.encodeUInt32(value.length));
                buffer.writeUTFBytes(value);
                break;
            default:
                let proto: any = protos.__messages[type] || this._clients['message ' + type];
                if (!!proto) {
                    let buf: egret.ByteArray = this.encodeProtos(proto, value);
                    buffer.writeBytes(this.encodeUInt32(buf.length));
                    buffer.writeBytes(buf);
                }
                break;
        }
    }

    static decodeProp(type: string, protos: any, buffer: egret.ByteArray): any {
        switch (type) {
            case 'uInt32':
                return this.decodeUInt32(buffer);
            case 'int32':
            case 'sInt32':
                return this.decodeSInt32(buffer);
            case 'float':
                let floats: egret.ByteArray = new egret.ByteArray();
                buffer.readBytes(floats, 0, 4);
                floats.endian = egret.Endian.LITTLE_ENDIAN;
                let float: number = buffer.readFloat();
                return floats.readFloat();
            case 'double':
                let doubles: egret.ByteArray = new egret.ByteArray();
                buffer.readBytes(doubles, 0, 8);
                doubles.endian = egret.Endian.LITTLE_ENDIAN;
                return doubles.readDouble();
            case 'string':
                let length: number = this.decodeUInt32(buffer);
                return buffer.readUTFBytes(length);
            default:
                let proto: any = protos && (protos.__messages[type] || this._servers['message ' + type]);
                if (proto) {
                    let len: number = this.decodeUInt32(buffer);
                    let buf: egret.ByteArray;
                    if (len) {
                        buf = new egret.ByteArray();
                        buffer.readBytes(buf, 0, len);
                    }

                    return len ? Protobuf.decodeProtos(proto, buf) : false;
                }
                break;
        }
    }

    static isSimpleType(type: string): boolean {
        return (
            type === 'uInt32' ||
            type === 'sInt32' ||
            type === 'int32' ||
            type === 'uInt64' ||
            type === 'sInt64' ||
            type === 'float' ||
            type === 'double'
        );
    }
    static encodeArray(array: Array<any>, proto: any, protos: any, buffer: egret.ByteArray): void {
        let isSimpleType = this.isSimpleType;
        if (isSimpleType(proto.type)) {
            buffer.writeBytes(this.encodeTag(proto.type, proto.tag));
            buffer.writeBytes(this.encodeUInt32(array.length));
            let encodeProp = this.encodeProp;
            for (let i: number = 0; i < array.length; i++) {
                encodeProp(array[i], proto.type, protos, buffer);
            }
        } else {
            let encodeTag = this.encodeTag;
            for (let j: number = 0; j < array.length; j++) {
                buffer.writeBytes(encodeTag(proto.type, proto.tag));
                this.encodeProp(array[j], proto.type, protos, buffer);
            }
        }
    }
    static decodeArray(array: Array<any>, type: string, protos: any, buffer: egret.ByteArray): void {
        let isSimpleType = this.isSimpleType;
        let decodeProp = this.decodeProp;

        if (isSimpleType(type)) {
            let length: number = this.decodeUInt32(buffer);
            for (let i: number = 0; i < length; i++) {
                array.push(decodeProp(type, protos, buffer));
            }
        } else {
            array.push(decodeProp(type, protos, buffer));
        }
    }

    static encodeUInt32(n: number): egret.ByteArray {
        let result: egret.ByteArray = new egret.ByteArray();

        do {
            let tmp: number = n % 128;
            let next: number = Math.floor(n / 128);

            if (next !== 0) {
                tmp = tmp + 128;
            }

            result.writeByte(tmp);
            n = next;
        }
        while (n !== 0);

        return result;
    }
    static decodeUInt32(buffer: egret.ByteArray): number {
        let n: number = 0;

        for (let i: number = 0; i < buffer.length; i++) {
            let m: number = buffer.readUnsignedByte();
            n = n + ((m & 0x7f) * Math.pow(2, (7 * i)));
            if (m < 128) {
                return n;
            }
        }
        return n;
    }
    static encodeSInt32(n: number): egret.ByteArray {
        n = n < 0 ? (Math.abs(n) * 2 - 1) : n * 2;

        return this.encodeUInt32(n);
    }
    static decodeSInt32(buffer: egret.ByteArray): number {
        let n: number = this.decodeUInt32(buffer);

        let flag: number = ((n % 2) === 1) ? -1 : 1;

        n = ((n % 2 + n) / 2) * flag;

        return n;
    }

}
class Routedic {
    private static _ids: any = {};
    private static _names: any = {};

    static init(dict: any): void {
        this._names = dict || {};
        let _names = this._names;
        let _ids = this._ids;
        for (let name in _names) {
            _ids[_names[name]] = name;
        }
    }

    static getID(name: string) {
        return this._names[name];
    }
    static getName(id: number) {
        return this._ids[id];
    }
}

interface IMessage {
    /**
     * encode
     * @param id
     * @param route
     * @param msg
     * @return ByteArray
     */
    encode(id: number, route: string, msg: any): egret.ByteArray;

    /**
     * decode
     * @param buffer
     * @return Object
     */
    decode(buffer: egret.ByteArray): any;
}
interface IPackage {

    encode(type: number, body?: egret.ByteArray): egret.ByteArray;

    decode(buffer: egret.ByteArray): any;
}

