
import * as egret from "./ByteArray";
import * as WebSocket from "ws";

/**
 * Created by govo on 15/8/14.
 *
 * Pinus Client for Egret, with protobuf support, with js ws client version 0.0.5
 * Github: https://github.com/govo/PinusForEgret.git
 *
 * Thanks to:
 * D-Deo @ https://github.com/D-Deo/pinus-flash-tcp.git
 * and yicaoyimu @ http://bbs.egret.com/forum.php?mod=viewthread&tid=2538&highlight=pinus
 */




export class WSClient
{

    static DEBUG: boolean = false;
    static EVENT_IO_ERROR: string = "io-error";
    static EVENT_CLOSE: string = "close";
    static EVENT_KICK: string = "onKick";
    static EVENT_HEART_BEAT_TIMEOUT: string = 'heartbeat timeout';

    private JS_WS_CLIENT_TYPE: string = 'js-websocket';
    private JS_WS_CLIENT_VERSION: string = '0.0.5';

    private RES_OK: number = 200;
    private RES_FAIL: number = 500;
    private RES_OLD_CLIENT: number = 501;


    private socket: WebSocket = null;
    private callbacks: any = {};
    private handlers: any = {};
    // Map from request id to route
    private routeMap = {};

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

    constructor()
    {

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


    public init(params, cb: Function): void
    {
        console.log("init", params);
        this.initCallback = cb;
        var host = params.host;
        var port = params.port;
        //
        //var url = 'ws://' + host;
        //if(port) {
        //    url +=  ':' + port;
        //}

        this.handshakeBuffer.user = params.user;
        this.handshakeCallback = params.handshakeCallback;
        this.initWebSocket(host, port, cb);
    }
    private initWebSocket(host, port, cb: Function): void
    {
        console.log("[Pinus] connect to:", host, port);

        var onopen = (event) =>
        {
            this.onConnect();
        };
        var onmessage = (event) =>
        {
            this.onMessage(event);
        };
        var onerror = (event) =>
        {
            this.onIOError(event);
        };
        var onclose = (event) =>
        {
            this.onClose(event);
        };
        var url = 'ws://' + host;
        if (port)
        {
            url += ':' + port;
        }
        var socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        socket.onopen = onopen;
        socket.onmessage = onmessage;
        socket.onerror = onerror;
        socket.onclose = onclose;
        this.socket = socket;
    }


    public on(event, fn)
    {
        (this._callbacks[event] = this._callbacks[event] || []).push(fn);
    }
    public request(route, msg, cb)
    {
        if (arguments.length === 2 && typeof msg === 'function')
        {
            cb = msg;
            msg = {};
        } else
        {
            msg = msg || {};
        }
        route = route || msg.route;
        if (!route)
        {
            return;
        }

        this.reqId++;
        if (this.reqId > 127)
        {
            this.reqId = 1;
        }
        var reqId = this.reqId;


        if (WSClient.DEBUG)
        {
            console.log(`REQUEST:route:${route} , reqId:${reqId}, msg:${msg}`);
        }

        this.sendMessage(reqId, route, msg);

        this.callbacks[reqId] = cb;
        this.routeMap[reqId] = route;
    }

    public notify(route: string, msg: any): void
    {
        this.sendMessage(0, route, msg);
    }

    private onMessage(event: { data: string | Buffer | ArrayBuffer | Buffer[]; type: string; target: WebSocket }): void
    {
        this.processPackage(this._package.decode(new egret.ByteArray(<ArrayBuffer>event.data)));

    }
    private sendMessage(reqId, route, msg)
    {
        var byte: egret.ByteArray;

        byte = this._message.encode(reqId, route, msg);
        byte = this._package.encode(Package.TYPE_DATA, byte);

        this.send(byte);

    }

    private onConnect(): void
    {
        console.log("[Pinus] connect success");
        this.send(this._package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer))));
    }

    private onClose(e: any): void
    {
        console.error("[Pinus] connect close:", e);
        //this.emit(Pinus.EVENT_CLOSE,e);
    }

    private onIOError(e: any): void
    {
        //this.emit(Pinus.EVENT_IO_ERROR, e);
        console.error('socket error: ', e);
    }

    private onKick(event)
    {
        //this.emit(WSClient.EVENT_KICK,event);
    }
    private onData(data)
    {
        //probuff decode
        var msg = this._message.decode(data);

        if (msg.id > 0)
        {
            msg.route = this.routeMap[msg.id];
            delete this.routeMap[msg.id];
            if (!msg.route)
            {
                return;
            }
        }

        //msg.body = this.deCompose(msg);

        this.processMessage(msg);

    }

    private processMessage(msg)
    {
        if (!msg.id)
        {
            // server push message

            if (WSClient.DEBUG)
            {
                console.log(`EVENT: Route:${msg.route} Msg:${msg.body}`);
            }

            //this.emit(msg.route, msg.body);
            return;
        }
        if (WSClient.DEBUG)
        {
            console.log(`RESPONSE: Id:${msg.id} Msg:${msg.body}`);
        }

        //if have a id then find the callback function with the request
        var cb = this.callbacks[msg.id];

        delete this.callbacks[msg.id];
        if (typeof cb !== 'function')
        {
            return;
        }
        if (msg.body && msg.body.code == 500)
        {
            var obj: any = { "code": 500, "desc": "服务器内部错误", "key": "INTERNAL_ERROR" };
            msg.body.error = obj;
        }
        cb(msg.body);
        return;
    }

    private heartbeat(data)
    {

        if (!this.heartbeatInterval)
        {
            // no heartbeat
            return;
        }

        var obj = this._package.encode(Package.TYPE_HEARTBEAT);
        if (this.heartbeatTimeoutId)
        {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }

        if (this.heartbeatId)
        {
            // already in a heartbeat interval
            return;
        }

        var self = this;
        self.heartbeatId = setTimeout(function ()
        {
            self.heartbeatId = null;
            self.send(obj);

            self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout;
            self.heartbeatTimeoutId = setTimeout(self.heartbeatTimeoutCb.bind(self, data), self.heartbeatTimeout);
        }, self.heartbeatInterval);
    }
    private heartbeatTimeoutCb(data)
    {
        var gap = this.nextHeartbeatTimeout - Date.now();
        if (gap > this.gapThreshold)
        {
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this, data), gap);
        } else
        {
            console.error('server heartbeat timeout', data);
            //this.emit(WSClient.EVENT_HEART_BEAT_TIMEOUT,data);
            this._disconnect();
        }
    }
    public off(event?, fn?)
    {
        this.removeAllListeners(event, fn);
    }
    public removeAllListeners(event?, fn?)
    {
        // all
        if (0 == arguments.length)
        {
            this._callbacks = {};
            return;
        }

        // specific event
        var callbacks = this._callbacks[event];
        if (!callbacks)
        {
            return;
        }

        // remove all handlers
        if (event && !fn)
        {
            delete this._callbacks[event];
            return;
        }

        // remove specific handler
        var i = this.index(callbacks, fn._off || fn);
        if (~i)
        {
            callbacks.splice(i, 1);
        }
        return;
    }
    private index(arr, obj)
    {
        if ([].indexOf)
        {
            return arr.indexOf(obj);
        }

        for (var i = 0; i < arr.length; ++i)
        {
            if (arr[i] === obj)
                return i;
        }
        return -1;
    }
    public disconnect(): void
    {
        this._disconnect();
    }
    private _disconnect(): void
    {
        console.warn("[Pinus] client disconnect ...");

        if (this.socket) this.socket.close();
        this.socket = null;
        if (this.heartbeatId)
        {
            clearTimeout(this.heartbeatId);
            this.heartbeatId = null;
        }

        if (this.heartbeatTimeoutId)
        {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }

    }
    private processPackage(msg): void
    {
        this.handlers[msg.type].apply(this, [msg.body]);
    }
    private handshake(resData)
    {

        var data = JSON.parse(Protocol.strdecode(resData));
        if (data.code === this.RES_OLD_CLIENT)
        {
            //this.emit(WSClient.EVENT_IO_ERROR, 'client version not fullfill');
            return;
        }

        if (data.code !== this.RES_OK)
        {
            //this.emit(WSClient.EVENT_IO_ERROR, 'handshake fail');
            return;
        }

        this.handshakeInit(data);

        var obj = this._package.encode(Package.TYPE_HANDSHAKE_ACK);
        this.send(obj);
        if (this.initCallback)
        {
            this.initCallback(data);
            this.initCallback = null;
        }
    }
    private handshakeInit(data): void
    {

        if (data.sys)
        {
            Routedic.init(data.sys.dict);
            Protobuf.init(data.sys.protos);
        }
        if (data.sys && data.sys.heartbeat)
        {
            this.heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
            this.heartbeatTimeout = this.heartbeatInterval * 2;        // max heartbeat timeout
        } else
        {
            this.heartbeatInterval = 0;
            this.heartbeatTimeout = 0;
        }

        if (typeof this.handshakeCallback === 'function')
        {
            this.handshakeCallback(data.user);
        }
    }
    private send(byte: egret.ByteArray): void
    {
        if (this.socket)
        {
            this.socket.send(byte.buffer);
        }
    }
    //private deCompose(msg){
    //    return JSON.parse(Protocol.strdecode(msg.body));
    //}
    private emit(event, ...args: any[])
    {
        var params = [].slice.call(arguments, 1);
        var callbacks = this._callbacks[event];

        if (callbacks)
        {
            callbacks = callbacks.slice(0);
            for (var i = 0, len = callbacks.length; i < len; ++i)
            {
                callbacks[i].apply(this, params);
            }
        }

        return this;
    }


}

class Package implements IPackage
{
    static TYPE_HANDSHAKE: number = 1;
    static TYPE_HANDSHAKE_ACK: number = 2;
    static TYPE_HEARTBEAT: number = 3;
    static TYPE_DATA: number = 4;
    static TYPE_KICK: number = 5;

    public encode(type: number, body?: egret.ByteArray)
    {
        var length: number = body ? body.length : 0;

        var buffer: egret.ByteArray = new egret.ByteArray();
        buffer.writeByte(type & 0xff);
        buffer.writeByte((length >> 16) & 0xff);
        buffer.writeByte((length >> 8) & 0xff);
        buffer.writeByte(length & 0xff);

        if (body) buffer.writeBytes(body, 0, body.length);

        return buffer;
    }
    public decode(buffer: egret.ByteArray)
    {

        var type: number = buffer.readUnsignedByte();
        var len: number = (buffer.readUnsignedByte() << 16 | buffer.readUnsignedByte() << 8 | buffer.readUnsignedByte()) >>> 0;

        var body: egret.ByteArray;

        if (buffer.bytesAvailable >= len)
        {
            body = new egret.ByteArray();
            if (len) buffer.readBytes(body, 0, len);
        }
        else
        {
            console.log("[Package] no enough length for current type:", type);
        }

        return { type: type, body: body, length: len };
    }
}

class Message implements IMessage
{

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

    constructor(private routeMap: {})
    {

    }

    public encode(id: number, route: string, msg: any)
    {
        var buffer: egret.ByteArray = new egret.ByteArray();

        var type: number = id ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

        var byte: egret.ByteArray = Protobuf.encode(route, msg) || Protocol.strencode(JSON.stringify(msg));

        var rot: any = Routedic.getID(route) || route;

        buffer.writeByte((type << 1) | ((typeof (rot) == "string") ? 0 : 1));

        if (id)
        {
            // 7.x
            do
            {
                var tmp: number = id % 128;
                var next: number = Math.floor(id / 128);

                if (next != 0)
                {
                    tmp = tmp + 128;
                }

                buffer.writeByte(tmp);

                id = next;
            } while (id != 0);

            // 5.x
            //				var len:Array = [];
            //				len.push(id & 0x7f);
            //				id >>= 7;
            //				while(id > 0)
            //				{
            //					len.push(id & 0x7f | 0x80);
            //					id >>= 7;
            //				}
            //
            //				for (var i:int = len.length - 1; i >= 0; i--)
            //				{
            //					buffer.writeByte(len[i]);
            //				}
        }

        if (rot)
        {
            if (typeof rot == "string")
            {
                buffer.writeByte(rot.length & 0xff);
                buffer.writeUTFBytes(rot);
            }
            else
            {
                buffer.writeByte((rot >> 8) & 0xff);
                buffer.writeByte(rot & 0xff);
            }
        }

        if (byte)
        {
            buffer.writeBytes(byte);
        }

        return buffer;
    }

    public decode(buffer: egret.ByteArray): any
    {
        // parse flag
        var flag: number = buffer.readUnsignedByte();
        var compressRoute: number = flag & Message.MSG_COMPRESS_ROUTE_MASK;
        var type: number = (flag >> 1) & Message.MSG_TYPE_MASK;
        var route: any;

        // parse id
        var id: number = 0;
        if (type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE)
        {
            // 7.x
            var i: number = 0;
            do
            {
                var m: number = buffer.readUnsignedByte();
                id = id + ((m & 0x7f) * Math.pow(2, (7 * i)));
                i++;
            } while (m >= 128);

            // 5.x
            //				var byte:int = buffer.readUnsignedByte();
            //				id = byte & 0x7f;
            //				while(byte & 0x80)
            //				{
            //					id <<= 7;
            //					byte = buffer.readUnsignedByte();
            //					id |= byte & 0x7f;
            //				}
        }

        // parse route
        if (type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY || type === Message.TYPE_PUSH)
        {

            if (compressRoute)
            {
                route = buffer.readUnsignedShort();
            }
            else
            {
                var routeLen: number = buffer.readUnsignedByte();
                route = routeLen ? buffer.readUTFBytes(routeLen) : "";
            }
        }
        else if (type === Message.TYPE_RESPONSE)
        {
            route = this.routeMap[id];
        }

        if (!id && !(typeof (route) == "string"))
        {
            route = Routedic.getName(route);
        }

        var body: any = Protobuf.decode(route, buffer) || JSON.parse(Protocol.strdecode(buffer));

        return { id: id, type: type, route: route, body: body };
    }

}
class Protocol
{

    public static strencode(str: string): egret.ByteArray
    {
        var buffer: egret.ByteArray = new egret.ByteArray();
        buffer.length = str.length;
        buffer.writeUTFBytes(str);
        return buffer;
    }

    public static strdecode(byte: egret.ByteArray): string
    {
        return byte.readUTFBytes(byte.bytesAvailable);
    }
}
class Protobuf
{
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

    static init(protos: any): void
    {
        this._clients = protos && protos.client || {};
        this._servers = protos && protos.server || {};
    }

    static encode(route: string, msg: any): egret.ByteArray
    {

        var protos: any = this._clients[route];

        if (!protos) return null;

        return this.encodeProtos(protos, msg);
    }

    static decode(route: string, buffer: egret.ByteArray): any
    {

        var protos: any = this._servers[route];

        if (!protos) return null;

        return this.decodeProtos(protos, buffer);
    }
    private static encodeProtos(protos: any, msg: any): egret.ByteArray
    {
        var buffer: egret.ByteArray = new egret.ByteArray();

        for (var name in msg)
        {
            if (protos[name])
            {
                var proto: any = protos[name];

                switch (proto.option)
                {
                    case "optional":
                    case "required":
                        buffer.writeBytes(this.encodeTag(proto.type, proto.tag));
                        this.encodeProp(msg[name], proto.type, protos, buffer);
                        break;
                    case "repeated":
                        if (!!msg[name] && msg[name].length > 0)
                        {
                            this.encodeArray(msg[name], proto, protos, buffer);
                        }
                        break;
                }
            }
        }

        return buffer;
    }
    static decodeProtos(protos: any, buffer: egret.ByteArray): any
    {
        var msg: any = {};

        while (buffer.bytesAvailable)
        {
            var head: any = this.getHead(buffer);
            var name: string = protos.__tags[head.tag];

            switch (protos[name].option)
            {
                case "optional":
                case "required":
                    msg[name] = this.decodeProp(protos[name].type, protos, buffer);
                    break;
                case "repeated":
                    if (!msg[name])
                    {
                        msg[name] = [];
                    }
                    this.decodeArray(msg[name], protos[name].type, protos, buffer);
                    break;
            }
        }

        return msg;
    }

    static encodeTag(type: number, tag: number): egret.ByteArray
    {
        var value: number = this.TYPES[type] != undefined ? this.TYPES[type] : 2;

        return this.encodeUInt32((tag << 3) | value);
    }
    static getHead(buffer: egret.ByteArray): any
    {
        var tag: number = this.decodeUInt32(buffer);

        return { type: tag & 0x7, tag: tag >> 3 };
    }
    static encodeProp(value: any, type: string, protos: any, buffer: egret.ByteArray): void
    {
        switch (type)
        {
            case 'uInt32':
                buffer.writeBytes(this.encodeUInt32(value));
                break;
            case 'int32':
            case 'sInt32':
                buffer.writeBytes(this.encodeSInt32(value));
                break;
            case 'float':
                //Float32Array
                var floats: egret.ByteArray = new egret.ByteArray();
                floats.endian = egret.Endian.LITTLE_ENDIAN;
                floats.writeFloat(value);
                buffer.writeBytes(floats);
                break;
            case 'double':
                var doubles: egret.ByteArray = new egret.ByteArray();
                doubles.endian = egret.Endian.LITTLE_ENDIAN;
                doubles.writeDouble(value);
                buffer.writeBytes(doubles);
                break;
            case 'string':
                buffer.writeBytes(this.encodeUInt32(value.length));
                buffer.writeUTFBytes(value);
                break;
            default:
                var proto: any = protos.__messages[type] || this._clients["message " + type];
                if (!!proto)
                {
                    var buf: egret.ByteArray = this.encodeProtos(proto, value);
                    buffer.writeBytes(this.encodeUInt32(buf.length));
                    buffer.writeBytes(buf);
                }
                break;
        }
    }

    static decodeProp(type: string, protos: any, buffer: egret.ByteArray): any
    {
        switch (type)
        {
            case 'uInt32':
                return this.decodeUInt32(buffer);
            case 'int32':
            case 'sInt32':
                return this.decodeSInt32(buffer);
            case 'float':
                var floats: egret.ByteArray = new egret.ByteArray();
                buffer.readBytes(floats, 0, 4);
                floats.endian = egret.Endian.LITTLE_ENDIAN;
                var float: number = buffer.readFloat();
                return floats.readFloat();
            case 'double':
                var doubles: egret.ByteArray = new egret.ByteArray();
                buffer.readBytes(doubles, 0, 8);
                doubles.endian = egret.Endian.LITTLE_ENDIAN;
                return doubles.readDouble();
            case 'string':
                var length: number = this.decodeUInt32(buffer);
                return buffer.readUTFBytes(length);
            default:
                var proto: any = protos && (protos.__messages[type] || this._servers["message " + type]);
                if (proto)
                {
                    var len: number = this.decodeUInt32(buffer);

                    if (len)
                    {
                        var buf: egret.ByteArray = new egret.ByteArray();
                        buffer.readBytes(buf, 0, len);
                    }

                    return len ? Protobuf.decodeProtos(proto, buf) : false;
                }
                break;
        }
    }

    static isSimpleType(type: string): boolean
    {
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
    static encodeArray(array: Array<any>, proto: any, protos: any, buffer: egret.ByteArray): void
    {
        var isSimpleType = this.isSimpleType;
        if (isSimpleType(proto.type))
        {
            buffer.writeBytes(this.encodeTag(proto.type, proto.tag));
            buffer.writeBytes(this.encodeUInt32(array.length));
            var encodeProp = this.encodeProp;
            for (var i: number = 0; i < array.length; i++)
            {
                encodeProp(array[i], proto.type, protos, buffer);
            }
        } else
        {
            var encodeTag = this.encodeTag;
            for (var j: number = 0; j < array.length; j++)
            {
                buffer.writeBytes(encodeTag(proto.type, proto.tag));
                this.encodeProp(array[j], proto.type, protos, buffer);
            }
        }
    }
    static decodeArray(array: Array<any>, type: string, protos: any, buffer: egret.ByteArray): void
    {
        var isSimpleType = this.isSimpleType;
        var decodeProp = this.decodeProp;

        if (isSimpleType(type))
        {
            var length: number = this.decodeUInt32(buffer);
            for (var i: number = 0; i < length; i++)
            {
                array.push(decodeProp(type, protos, buffer));
            }
        } else
        {
            array.push(decodeProp(type, protos, buffer));
        }
    }

    static encodeUInt32(n: number): egret.ByteArray
    {
        var result: egret.ByteArray = new egret.ByteArray();

        do
        {
            var tmp: number = n % 128;
            var next: number = Math.floor(n / 128);

            if (next !== 0)
            {
                tmp = tmp + 128;
            }

            result.writeByte(tmp);
            n = next;
        }
        while (n !== 0);

        return result;
    }
    static decodeUInt32(buffer: egret.ByteArray): number
    {
        var n: number = 0;

        for (var i: number = 0; i < buffer.length; i++)
        {
            var m: number = buffer.readUnsignedByte();
            n = n + ((m & 0x7f) * Math.pow(2, (7 * i)));
            if (m < 128)
            {
                return n;
            }
        }
        return n;
    }
    static encodeSInt32(n: number): egret.ByteArray
    {
        n = n < 0 ? (Math.abs(n) * 2 - 1) : n * 2;

        return this.encodeUInt32(n);
    }
    static decodeSInt32(buffer: egret.ByteArray): number
    {
        var n: number = this.decodeUInt32(buffer);

        var flag: number = ((n % 2) === 1) ? -1 : 1;

        n = ((n % 2 + n) / 2) * flag;

        return n;
    }

}
class Routedic
{
    private static _ids: Object = {};
    private static _names: Object = {};

    static init(dict: any): void
    {
        this._names = dict || {};
        var _names = this._names;
        var _ids = this._ids;
        for (var name in _names)
        {
            _ids[_names[name]] = name;
        }
    }

    static getID(name: string)
    {
        return this._names[name];
    }
    static getName(id: number)
    {
        return this._ids[id];
    }
}

interface IMessage
{
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
interface IPackage
{

    encode(type: number, body?: egret.ByteArray): egret.ByteArray

    decode(buffer: egret.ByteArray): any
}

