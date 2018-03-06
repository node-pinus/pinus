import { getLogger } from 'pinus-logger';
import * as taskManager from '../common/manager/taskManager';
import { pinus } from '../pinus';
let rsa = require('node-bignumber');
import { default as events } from '../util/events';
import * as utils from '../util/utils';
import { Application } from '../application';
import { ConnectionComponent } from './connection';
import { IComponent } from '../interfaces/IComponent';
import { PushSchedulerComponent } from './pushScheduler';
import { SIOConnector, SIOConnectorOptions } from '../connectors/sioconnector';
import { ConnectionService } from '../common/service/connectionService';
import { Server } from '../server/server';
import { ServerComponent } from './server';
import { UID, SID } from '../util/constants';
import { ScheduleOptions } from '../interfaces/IPushScheduler';
import { SessionComponent } from './session';
import { IConnector, IEncoder, IDecoder } from '../interfaces/IConnector';
import { ISocket } from '../interfaces/ISocket';
import { Session } from '../common/service/sessionService';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));

export type BlackListFunction = (process: (err: Error, list: string[]) => void) => void;
export interface ConnectorComponentOptions {
    encode?: IEncoder;
    decode?: IDecoder;
    useCrypto?: boolean;
    useHostFilter?: boolean;
    useAsyncCoder?: boolean;
    blacklistFun?: BlackListFunction;
    useDict?: boolean;
    useProtobuf?: boolean;
}


export interface RsaKey {

}


/**
 * Connector component. Receive client requests and attach session with socket.
 *
 * @param {Object} app  current application context
 * @param {Object} opts attach parameters
 *                      opts.connector {Object} provides low level network and protocol details implementation between server and clients.
 */

export class ConnectorComponent implements IComponent {
    app: Application;
    connector: IConnector;
    encode: IEncoder;
    decode: IDecoder;
    useCrypto: boolean;
    useHostFilter: boolean;
    useAsyncCoder: boolean;
    blacklistFun: BlackListFunction;
    connection: ConnectionService;

    keys: {[id: number]: RsaKey} = {};
    blacklist: string[] = [];
    server: ServerComponent;
    session: SessionComponent;

    constructor(app: Application, opts?: ConnectorComponentOptions) {
        opts = opts || {};
        this.app = app;
        this.connector = getConnector(app, opts);
        this.encode = opts.encode;
        this.decode = opts.decode;
        this.useCrypto = opts.useCrypto;
        this.useHostFilter = opts.useHostFilter;
        this.useAsyncCoder = opts.useAsyncCoder;
        this.blacklistFun = opts.blacklistFun;

        if (opts.useDict) {
            app.load(pinus.components.dictionary, app.get('dictionaryConfig'));
        }

        if (opts.useProtobuf) {
            app.load(pinus.components.protobuf, app.get('protobufConfig'));
        }

        // component dependencies
        this.server = null;
        this.session = null;
    }
    name = '__connector__';

    start(cb: () => void) {
        this.server = this.app.components.__server__;
        this.session = this.app.components.__session__;
        this.connection = this.app.components.__connection__;

        // check component dependencies
        if (!this.server) {
            process.nextTick(function () {
                utils.invokeCallback(cb, new Error('fail to start connector component for no server component loaded'));
            });
            return;
        }

        if (!this.session) {
            process.nextTick(function () {
                utils.invokeCallback(cb, new Error('fail to start connector component for no session component loaded'));
            });
            return;
        }

        process.nextTick(cb);
    }

    afterStart(cb: () => void) {
        this.connector.start(cb);
        this.connector.on('connection', this.hostFilter.bind(this, this.bindEvents.bind(this)));
    }

    stop(force: boolean, cb: () => void) {
        if (this.connector) {
            this.connector.stop(force, cb);
            this.connector = null;
            return;
        } else {
            process.nextTick(cb);
        }
    }

    send(reqId: number, route: string, msg: any, recvs: SID[], opts: ScheduleOptions, cb: (err?: Error, resp ?: any) => void) {
        logger.debug('[%s] send message reqId: %s, route: %s, msg: %j, receivers: %j, opts: %j', this.app.serverId, reqId, route, msg, recvs, opts);
        if (this.useAsyncCoder) {
            return this.sendAsync(reqId, route, msg, recvs, opts, cb);
        }

        let emsg = msg;
        if (this.encode) {
            // use costumized encode
            emsg = this.encode.call(this, reqId, route, msg);
        } else if (this.connector.encode) {
            // use connector default encode
            emsg = this.connector.encode(reqId, route, msg);
        }

        this.doSend(reqId, route, emsg, recvs, opts, cb);
    }

    sendAsync(reqId: number, route: string, msg: any, recvs: SID[], opts: ScheduleOptions, cb: (err?: Error, resp ?: any) => void) {
        let emsg = msg;
        let self = this;

        /*
        if (this.encode)
        {
            // use costumized encode
            this.encode(reqId, route, msg, function (err, encodeMsg)
            {
                if (err)
                {
                    return cb(err);
                }

                emsg = encodeMsg;
                self.doSend(reqId, route, emsg, recvs, opts, cb);
            });
        } else if (this.connector.encode)
        {
            // use connector default encode
            this.connector.encode(reqId, route, msg, function (err, encodeMsg)
            {
                if (err)
                {
                    return cb(err);
                }

                emsg = encodeMsg;
                self.doSend(reqId, route, emsg, recvs, opts, cb);
            });
        }*/
        throw new Error('not implement sendAsync');
    }

    doSend(reqId: number, route: string, emsg: any, recvs: SID[], opts: ScheduleOptions, cb: (err?: Error) => void) {
        if (!emsg) {
            process.nextTick(function () {
                return cb && cb(new Error('fail to send message for encode result is empty.'));
            });
        }

        this.app.components.__pushScheduler__.schedule(reqId, route, emsg,
            recvs, opts, cb);
    }

    setPubKey(id: number, key: {rsa_n: string , rsa_e: string}) {
        let pubKey = new rsa.Key();
        pubKey.n = new rsa.BigInteger(key.rsa_n, 16);
        pubKey.e = key.rsa_e;
        this.keys[id] = pubKey;
    }

    getPubKey(id: number) {
        return this.keys[id];
    }


    hostFilter(cb: (socket: ISocket) => boolean, socket: ISocket) {
        if (!this.useHostFilter) {
            return cb(socket);
        }

        let ip = socket.remoteAddress.ip;
        let check = function (list: string[]) {
            for (let address in list) {
                let exp = new RegExp(list[address]);
                if (exp.test(ip)) {
                    socket.disconnect();
                    return true;
                }
            }
            return false;
        };
        // dynamical check
        if (this.blacklist.length !== 0 && !!check(this.blacklist)) {
            return;
        }
        // static check
        if (!!this.blacklistFun && typeof this.blacklistFun === 'function') {
            let self = this;
            self.blacklistFun((err, list) => {
                if (!!err) {
                    logger.error('connector blacklist error: %j', err.stack);
                    utils.invokeCallback(cb, socket);
                    return;
                }
                if (!Array.isArray(list)) {
                    logger.error('connector blacklist is not array: %j', list);
                    utils.invokeCallback(cb, socket);
                    return;
                }
                if (!!check(list)) {
                    return;
                } else {
                    utils.invokeCallback(cb, socket);
                    return;
                }
            });
        } else {
            utils.invokeCallback(cb, socket);
        }
    }

    bindEvents(socket: ISocket) {
        let curServer = this.app.getCurServer();
        let maxConnections = curServer['max-connections'];
        if (this.connection && maxConnections) {
            this.connection.increaseConnectionCount();
            let statisticInfo = this.connection.getStatisticsInfo();
            if (statisticInfo.totalConnCount > maxConnections) {
                logger.warn('the server %s has reached the max connections %s', curServer.id, maxConnections);
                socket.disconnect();
                return;
            }
        }

        // create session for connection
        let session = this.getSession(socket);
        let closed = false;

        socket.on('disconnect',  () => {
            if (closed) {
                return;
            }
            closed = true;
            if (this.connection) {
                this.connection.decreaseConnectionCount(session.uid);
            }
        });

        socket.on('error',  () => {
            if (closed) {
                return;
            }
            closed = true;
            if (this.connection) {
                this.connection.decreaseConnectionCount(session.uid);
            }
        });

        // new message
        socket.on('message',  (msg) => {
            let dmsg = msg;
            if (this.useAsyncCoder) {
                return this.handleMessageAsync(msg, session, socket);
            }

            if (this.decode) {
                dmsg = this.decode(msg);
            } else if (this.connector.decode) {
                dmsg = this.connector.decode(msg);
            }
            if (!dmsg) {
                // discard invalid message
                return;
            }

            // use rsa crypto
            if (this.useCrypto) {
                let verified = this.verifyMessage(session, dmsg);
                if (!verified) {
                    logger.error('fail to verify the data received from client.');
                    return;
                }
            }

            this.handleMessage(session, dmsg);
        }); // on message end
    }

    handleMessageAsync(msg: any, session: Session, socket: ISocket) {
        /*
        if (this.decode)
        {
            this.decode(msg, session, function (err, dmsg)
            {
                if (err)
                {
                    logger.error('fail to decode message from client %s .', err.stack);
                    return;
                }

                doHandleMessage(this, dmsg, session);
            });
        } else if (this.connector.decode)
        {
            this.connector.decode(msg, socket, function (err, dmsg)
            {
                if (err)
                {
                    logger.error('fail to decode message from client %s .', err.stack);
                    return;
                }

                doHandleMessage(this, dmsg, session);
            });
        }*/
        throw new Error('not implement handleMessageAsync');
    }

    doHandleMessage(dmsg: any, session: Session) {
        if (!dmsg) {
            // discard invalid message
            return;
        }

        // use rsa crypto
        if (this.useCrypto) {
            let verified = this.verifyMessage(session, dmsg);
            if (!verified) {
                logger.error('fail to verify the data received from client.');
                return;
            }
        }

        this.handleMessage(session, dmsg);
    }

    /**
     * get session for current connection
     */
    getSession(socket: ISocket) {
        let app = this.app,
            sid = socket.id;
        let session = this.session.get(sid);
        if (session) {
            return session;
        }

        session = this.session.create(sid, app.getServerId(), socket);
        logger.debug('[%s] getSession session is created with session id: %s', app.getServerId(), sid);

        // bind events for session
        socket.on('disconnect', session.closed.bind(session));
        socket.on('error', session.closed.bind(session));
        session.on('closed', this.onSessionClose.bind(this, app));
        session.on('bind',  (uid) => {
            logger.debug('session on [%s] bind with uid: %s', this.app.serverId, uid);
            // update connection statistics if necessary
            if (this.connection) {
                this.connection.addLoginedUser(uid, {
                    loginTime: Date.now(),
                    uid: uid,
                    address: socket.remoteAddress.ip + ':' + socket.remoteAddress.port
                });
            }
            this.app.event.emit(events.BIND_SESSION, session);
        });

        session.on('unbind',  (uid) => {
            if (this.connection) {
                this.connection.removeLoginedUser(uid);
            }
            this.app.event.emit(events.UNBIND_SESSION, session);
        });

        return session;
    }

    onSessionClose(app: Application, session: Session, reason: string) {
        taskManager.closeQueue(session.id, true);
        app.event.emit(events.CLOSE_SESSION, session);
    }

    handleMessage(session: Session, msg: any) {
        // logger.debug('[%s] handleMessage session id: %s, msg: %j', this.app.serverId, session.id, msg);
        let type = this.checkServerType(msg.route);
        if (!type) {
            logger.error('invalid route string. route : %j', msg.route);
            return;
        }
        this.server.globalHandle(msg, session.toFrontendSession(),  (err, resp) => {
            if (resp && !msg.id) {
                logger.warn('try to response to a notify: %j', msg.route);
                return;
            }
            if (!msg.id && !resp) return;
            if (!resp) resp = {};
            if (!!err && !resp.code) {
                resp.code = 500;
            }
            let opts: ScheduleOptions = {
                type: 'response'
            };

            this.send(msg.id, msg.route, resp, [session.id], opts,
                function () { });
        });
    }

    /**
     * Get server type form request message.
     */
    checkServerType(route: string) {
        if (!route) {
            return null;
        }
        let idx = route.indexOf('.');
        if (idx < 0) {
            return null;
        }
        return route.substring(0, idx);
    }

    verifyMessage(session: Session, msg: any) {
        let sig = msg.body.__crypto__;
        if (!sig) {
            logger.error('receive data from client has no signature [%s]', this.app.serverId);
            return false;
        }

        let pubKey;

        if (!session) {
            logger.error('could not find session.');
            return false;
        }

        if (!session.get('pubKey')) {
            pubKey = this.getPubKey(session.id);
            if (!!pubKey) {
                delete this.keys[session.id];
                session.set('pubKey', pubKey);
            } else {
                logger.error('could not get public key, session id is %s', session.id);
                return false;
            }
        } else {
            pubKey = session.get('pubKey');
        }

        if (!pubKey.n || !pubKey.e) {
            logger.error('could not verify message without public key [%s]', this.app.serverId);
            return false;
        }

        delete msg.body.__crypto__;

        let message = JSON.stringify(msg.body);
        if (utils.hasChineseChar(message))
            message = utils.unicodeToUtf8(message);

        return pubKey.verifyString(message, sig);
    }

}
let getConnector = function (app: Application, opts: any) {
    let connector = opts.connector;
    if (!connector) {
        return getDefaultConnector(app, opts);
    }

    if (typeof connector !== 'function') {
        return connector;
    }

    let curServer = app.getCurServer();
    return new connector(curServer.clientPort, curServer.host, opts);
};

let getDefaultConnector = function (app: Application, opts: SIOConnectorOptions) {
    let curServer = app.getCurServer();
    return new SIOConnector(curServer.clientPort, curServer.host, opts);
};