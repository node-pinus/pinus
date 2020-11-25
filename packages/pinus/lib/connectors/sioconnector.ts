import * as util from 'util';
import { EventEmitter } from 'events';
import { createServer } from 'http';
let httpServer = createServer();
import { SioSocket } from './siosocket';
import { IConnector } from '../interfaces/IConnector';
import * as socket_io from 'socket.io';

let PKG_ID_BYTES = 4;
let PKG_ROUTE_LENGTH_BYTES = 1;
let PKG_HEAD_BYTES = PKG_ID_BYTES + PKG_ROUTE_LENGTH_BYTES;

let curId = 1;
export type SIOConnectorOptions = socket_io.ServerOptions;

/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Develper can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
export class SIOConnector extends EventEmitter implements IConnector {
    port: number;
    host: string;
    opts: SIOConnectorOptions;
    private server: SocketIO.Server;


    constructor(port: number, host: string, opts: SIOConnectorOptions) {
        super();
        this.port = port;
        this.host = host;
        this.opts = opts;
        opts.pingTimeout = opts.pingTimeout || 60;
        opts.pingInterval = opts.pingInterval || 25;
    }



    /**
     * Start connector to listen the specified port
     */
    start(cb: () => void) {
        let self = this;
        // issue https://github.com/NetEase/pinus-cn/issues/174
        let opts: SIOConnectorOptions;
        if (!!this.opts) {
            opts = this.opts;
        }
        else {
            opts = {
                transports: [
                    'websocket', 'polling-xhr', 'polling-jsonp', 'polling'
                ]
            } as any;
        }

        opts.path = '/socket.io';
        let sio = socket_io(httpServer, opts);

        let port = this.port;
        httpServer.listen(port, function () {
            console.log('sio Server listening at port %d', port);
        });

        sio.on('connection', (socket) => {
            // this.wsocket.sockets.on('connection', function (socket) {
            let siosocket = new SioSocket(curId++, socket);
            self.emit('connection', siosocket);
            siosocket.on('closing', function (reason) {
                siosocket.send({ route: 'onKick', reason: reason });
            });
        });

        process.nextTick(cb);
    }

    /**
     * Stop connector
     */
    stop(force: boolean, cb: () => void) {
        this.server.close();
        process.nextTick(cb);
    }

    encode(reqId: number, route: string, msg: any) {
        if (reqId) {
            return composeResponse(reqId, route, msg);
        } else {
            return composePush(route, msg);
        }
    }

    /**
     * Decode client message package.
     *
     * Package format:
     *   message id: 4bytes big-endian integer
     *   route length: 1byte
     *   route: route length bytes
     *   body: the rest bytes
     *
     * @param  {String} data socket.io package from client
     * @return {Object}      message object
     */
    decode(msg: any) {
        let index = 0;

        let id = parseIntField(msg, index, PKG_ID_BYTES);
        index += PKG_ID_BYTES;

        let routeLen = parseIntField(msg, index, PKG_ROUTE_LENGTH_BYTES);

        let route = msg.substr(PKG_HEAD_BYTES, routeLen);
        let body = msg.substr(PKG_HEAD_BYTES + routeLen);

        return {
            id: id,
            route: route,
            body: JSON.parse(body)
        };
    }

}

let composeResponse = function (msgId: number, route: string, msgBody: any) {
    return {
        id: msgId,
        body: msgBody
    };
};

let composePush = function (route: string, msgBody: any) {
    return JSON.stringify({ route: route, body: msgBody });
};

let parseIntField = function (str: string, offset: number, len: number) {
    let res = 0;
    for (let i = 0; i < len; i++) {
        if (i > 0) {
            res <<= 8;
        }
        res |= str.charCodeAt(offset + i) & 0xff;
    }

    return res;
};