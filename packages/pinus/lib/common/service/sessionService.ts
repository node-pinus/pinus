import { EventEmitter } from 'events';
import * as  util from 'util';
import { getLogger } from 'pinus-logger';
import * as utils from '../../util/utils';
import { SID, FRONTENDID, UID } from '../../util/constants';
import { ISocket } from '../../interfaces/ISocket';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));

let FRONTEND_SESSION_FIELDS = ['id', 'frontendId', 'uid', '__sessionService__'];
let EXPORTED_SESSION_FIELDS = ['id', 'frontendId', 'uid', 'settings'];

let ST_INITED = 0;
let ST_CLOSED = 1;

export interface SessionServiceOptions {singleSession ?: Session; }

/**
 * Session service maintains the internal session for each client connection.
 *
 * Session service is created by session component and is only
 * <b>available</b> in frontend servers. You can access the service by
 * `app.get('sessionService')` or `app.sessionService` in frontend servers.
 *
 * @param {Object} opts constructor parameters
 * @class
 * @constructor
 */
export class SessionService {
    singleSession: Session;
    sessions: { [sid: number]: Session };
    uidMap: { [uid: string]: Session[] };

    constructor(opts ?: SessionServiceOptions) {
        opts = opts || {};
        this.singleSession = opts.singleSession;
        this.sessions = {};     // sid -> session
        this.uidMap = {};       // uid -> sessions
    }

    /**
     * Create and return internal session.
     *
     * @param {Integer} sid uniqe id for the internal session
     * @param {String} frontendId frontend server in which the internal session is created
     * @param {Object} socket the underlying socket would be held by the internal session
     *
     * @return {Session}
     *
     * @memberOf SessionService
     * @api private
     */
    create(sid: SID, frontendId: FRONTENDID, socket: ISocket) {
        let session = new Session(sid, frontendId, socket, this);
        this.sessions[session.id] = session;

        return session;
    }

    /**
     * Bind the session with a user id.
     *
     * @memberOf SessionService
     * @api private
     */
    bind(sid: SID, uid: UID, cb: (err: Error | null , result ?: void) => void) {
        let session = this.sessions[sid];

        if (!session) {
            process.nextTick(function () {
                cb(new Error('session does not exist, sid: ' + sid));
            });
            return;
        }

        if (session.uid) {
            if (session.uid === uid) {
                // already bound with the same uid
                cb(null);
                return;
            }

            // already bound with other uid
            process.nextTick(function () {
                cb(new Error('session has already bound with ' + session.uid));
            });
            return;
        }

        let sessions = this.uidMap[uid];

        if (!!this.singleSession && !!sessions) {
            process.nextTick(function () {
                cb(new Error('singleSession is enabled, and session has already bound with uid: ' + uid));
            });
            return;
        }

        if (!sessions) {
            sessions = this.uidMap[uid] = [];
        }

        for (let i = 0, l = sessions.length; i < l; i++) {
            // session has binded with the uid
            if (sessions[i].id === session.id) {
                process.nextTick(cb);
                return;
            }
        }
        sessions.push(session);

        session.bind(uid);

        if (cb) {
            process.nextTick(cb);
        }
    }

    /**
     * Unbind a session with the user id.
     *
     * @memberOf SessionService
     * @api private
     */
    unbind(sid: SID, uid: UID, cb: (err ?: Error , result ?: void) => void) {
        let session = this.sessions[sid];

        if (!session) {
            process.nextTick(function () {
                cb(new Error('session does not exist, sid: ' + sid));
            });
            return;
        }

        if (!session.uid || session.uid !== uid) {
            process.nextTick(function () {
                cb(new Error('session has not bind with ' + session.uid));
            });
            return;
        }

        let sessions = this.uidMap[uid], sess;
        if (sessions) {
            for (let i = 0, l = sessions.length; i < l; i++) {
                sess = sessions[i];
                if (sess.id === sid) {
                    sessions.splice(i, 1);
                    break;
                }
            }

            if (sessions.length === 0) {
                delete this.uidMap[uid];
            }
        }
        session.unbind(uid);

        if (cb) {
            process.nextTick(cb);
        }
    }

    /**
     * Get session by id.
     *
     * @param {Number} id The session id
     * @return {Session}
     *
     * @memberOf SessionService
     * @api private
     */
    get(sid: SID) {
        return this.sessions[sid];
    }

    /**
     * Get sessions by userId.
     *
     * @param {Number} uid User id associated with the session
     * @return {Array} list of session binded with the uid
     *
     * @memberOf SessionService
     * @api private
     */
    getByUid(uid: UID) {
        return this.uidMap[uid];
    }

    /**
     * Remove session by key.
     *
     * @param {Number} sid The session id
     *
     * @memberOf SessionService
     * @api private
     */
    remove(sid: SID) {
        let session = this.sessions[sid];
        if (session) {
            let uid = session.uid;
            delete this.sessions[session.id];

            let sessions = this.uidMap[uid];
            if (!sessions) {
                return;
            }

            for (let i = 0, l = sessions.length; i < l; i++) {
                if (sessions[i].id === sid) {
                    sessions.splice(i, 1);
                    if (sessions.length === 0) {
                        delete this.uidMap[uid];
                    }
                    break;
                }
            }
        }
    }

    /**
     * Import the key/value into session.
     *
     * @api private
     */
    import(sid: SID, key: string, value: string, cb: (err ?: Error , result ?: void) => void) {
        let session = this.sessions[sid];
        if (!session) {
            utils.invokeCallback(cb, new Error('session does not exist, sid: ' + sid));
            return;
        }
        session.set(key, value);
        utils.invokeCallback(cb);
    }

    /**
     * Import new value for the existed session.
     *
     * @memberOf SessionService
     * @api private
     */
    importAll(sid: SID, settings: {[key: string]: any}, cb: (err ?: Error , result ?: void) => void) {
        let session = this.sessions[sid];
        if (!session) {
            utils.invokeCallback(cb, new Error('session does not exist, sid: ' + sid));
            return;
        }

        for (let f in settings) {
            session.set(f, settings[f]);
        }
        utils.invokeCallback(cb);
    }

    /**
     * Kick all the session offline under the user id.
     *
     * @param {Number}   uid user id asscociated with the session
     * @param {Function} cb  callback function
     *
     * @memberOf SessionService
     */
    kick(uid: UID, reason ?: string, cb ?: (err ?: Error , result ?: void) => void) {
        // compatible for old kick(uid, cb);
        if (typeof reason === 'function') {
            cb = reason;
            reason = 'kick';
        }
        let sessions = this.getByUid(uid);

        if (sessions) {
            // notify client
            let sids: SID[] = [];
            let self = this;
            sessions.forEach(function (session) {
                sids.push(session.id);
            });

            sids.forEach(function (sid) {
                self.sessions[sid].closed(reason);
            });

            process.nextTick(function () {
                utils.invokeCallback(cb);
            });
        } else {
            process.nextTick(function () {
                utils.invokeCallback(cb);
            });
        }
    }

    /**
     * Kick a user offline by session id.
     *
     * @param {Number}   sid session id
     * @param {Function} cb  callback function
     *
     * @memberOf SessionService
     */
    kickBySessionId(sid: SID, reason ?: string, cb ?: (err ?: Error , result ?: void) => void) {
        if (typeof reason === 'function') {
            cb = reason;
            reason = 'kick';
        }

        let session = this.get(sid);

        if (session) {
            // notify client
            session.closed(reason);
            process.nextTick(function () {
                utils.invokeCallback(cb);
            });
        } else {
            process.nextTick(function () {
                utils.invokeCallback(cb);
            });
        }
    }

    /**
     * Get client remote address by session id.
     *
     * @param {Number}   sid session id
     * @return {Object} remote address of client
     *
     * @memberOf SessionService
     */
    getClientAddressBySessionId(sid: SID) {
        let session = this.get(sid);
        if (session) {
            let socket = session.__socket__;
            return socket.remoteAddress;
        } else {
            return null;
        }
    }

    /**
     * Send message to the client by session id.
     *
     * @param {String} sid session id
     * @param {Object} msg message to send
     *
     * @memberOf SessionService
     * @api private
     */
    sendMessage(sid: SID, msg: any) {
        let session = this.sessions[sid];

        if (!session) {
            logger.debug('Fail to send message for non-existing session, sid: ' + sid + ' msg: ' + msg);
            return false;
        }

        return send(this, session, msg);
    }

    /**
     * Send message to the client by user id.
     *
     * @param {String} uid userId
     * @param {Object} msg message to send
     *
     * @memberOf SessionService
     * @api private
     */
    sendMessageByUid(uid: UID, msg: any) {
        let sessions = this.uidMap[uid];

        if (!sessions) {
            logger.debug('fail to send message by uid for non-existing session. uid: %j',
                uid);
            return false;
        }

        for (let i = 0, l = sessions.length; i < l; i++) {
            send(this, sessions[i], msg);
        }
    }

    /**
     * Iterate all the session in the session service.
     *
     * @param  {Function} cb callback function to fetch session
     * @api private
     */
    forEachSession(cb: (session: Session) => void) {
        for (let sid in this.sessions) {
            cb(this.sessions[sid]);
        }
    }

    /**
     * Iterate all the binded session in the session service.
     *
     * @param  {Function} cb callback function to fetch session
     * @api private
     */
    forEachBindedSession(cb: (session: Session) => void) {
        let i, l, sessions;
        for (let uid in this.uidMap) {
            sessions = this.uidMap[uid];
            for (i = 0, l = sessions.length; i < l; i++) {
                cb(sessions[i]);
            }
        }
    }

    /**
     * Get sessions' quantity in specified server.
     *
     */
    getSessionsCount() {
        return utils.size(this.sessions);
    }


    akick: (uid: UID, reason ?: string) => Promise<void> = utils.promisify(this.kick);
    akickBySessionId: (sid: SID, reason ?: string) => Promise<void> = utils.promisify(this.kickBySessionId);
    abind: (sid: SID, uid: UID) => Promise<void> = utils.promisify(this.bind);
    aunbind: (sid: SID, uid: UID) => Promise<void> = utils.promisify(this.unbind);
    aimport: (sid: SID, key: string, value: any) => Promise<void> = utils.promisify(this.import);
    aimportAll: (sid: SID, settings: any) => Promise<void> = utils.promisify(this.importAll);
}
/**
 * Send message to the client that associated with the session.
 *
 * @api private
 */
let send = function(service: SessionService, session: Session, msg: any) {
  session.send(msg);

  return true;
};

export interface ISession {
    id: number;
    uid: string;
    frontendId: string;
    settings: {[key: string]: any};
}

/**
 * Session maintains the relationship between client connection and user information.
 * There is a session associated with each client connection. And it should bind to a
 * user id after the client passes the identification.
 *
 * Session is created in frontend server and should not be accessed in handler.
 * There is a proxy class called BackendSession in backend servers and FrontendSession
 * in frontend servers.
 */
export class Session extends EventEmitter implements ISession {
    id: SID;
    frontendId: FRONTENDID;
    uid: UID;
    settings: {[key: string]: any};

    __socket__: ISocket;
    private __sessionService__: SessionService;
    private __state__: number;


    constructor(sid: SID, frontendId: FRONTENDID, socket: ISocket, service: SessionService) {

        super();
        this.id = sid;          // r
        this.frontendId = frontendId; // r
        this.uid = null;        // r
        this.settings = {};

        // private
        this.__socket__ = socket;
        this.__sessionService__ = service;
        this.__state__ = ST_INITED;
    }

    /*
     * Export current session as frontend session.
     */
    toFrontendSession() {
        return new FrontendSession(this);
    }

    /**
     * Bind the session with the the uid.
     *
     * @param {Number} uid User id
     * @api public
     */
    bind(uid: UID) {
        this.uid = uid;
        this.emit('bind', uid);
    }

    /**
     * Unbind the session with the the uid.
     *
     * @param {Number} uid User id
     * @api private
     */
    unbind(uid: UID) {
        this.uid = null;
        this.emit('unbind', uid);
    }

    /**
     * Set values (one or many) for the session.
     *
     * @param {String|Object} key session key
     * @param {Object} value session value
     * @api public
     */
    set(values: {[key: string]: any}): void;
    set(key: string, value: any): void;
    set(keyOrValues: string | {[key: string]: any}, value ?: any) {
        if (utils.isObject(keyOrValues)) {
            let values = keyOrValues as {[key: string]: any};
            for (let i in values) {
                this.settings[i] = values[i];
            }
        } else {
            this.settings[keyOrValues as string] = value;
        }
    }

    /**
     * Remove value from the session.
     *
     * @param {String} key session key
     * @api public
     */
    remove(key: string) {
        delete this.settings[key];
    }

    /**
     * Get value from the session.
     *
     * @param {String} key session key
     * @return {Object} value associated with session key
     * @api public
     */
    get(key: string) {
        return this.settings[key];
    }

    /**
     * Send message to the session.
     *
     * @param  {Object} msg final message sent to client
     */
    send(msg: any) {
        this.__socket__.send(msg);
    }

    /**
     * Send message to the session in batch.
     *
     * @param  {Array} msgs list of message
     */
    sendBatch(msgs: any[]) {
        this.__socket__.sendBatch(msgs);
    }

    /**
     * Closed callback for the session which would disconnect client in next tick.
     *
     * @api public
     */
    closed(reason: string) {
        logger.debug('session on [%s] is closed with session id: %s', this.frontendId, this.id);
        if (this.__state__ === ST_CLOSED) {
            return;
        }
        this.__state__ = ST_CLOSED;
        this.__sessionService__.remove(this.id);
        this.emit('closed', this.toFrontendSession(), reason);
        this.__socket__.emit('closing', reason);

        let self = this;
        // give a chance to send disconnect message to client

        process.nextTick(function () {
            self.__socket__.disconnect();
        });
    }
    /**
     * 是否在线
     */
    get isOnline(): boolean {
        return this.__state__ !== ST_CLOSED;
    }

    /**
     * 获取客户端的地址
     */
    get remoteAddress() {
        return this.__socket__.remoteAddress;
    }
}

/**
 * Frontend session for frontend server.
 */
export class FrontendSession extends EventEmitter implements ISession {
    id: number;
    uid: string;
    frontendId: string;
    settings: { [key: string]: any; };
    private __session__: Session;
    private __sessionService__: SessionService;

    constructor(session: Session) {
        super();
        clone(session, this, FRONTEND_SESSION_FIELDS);
        // deep copy for settings
        this.settings = dclone(session.settings);
        this.__session__ = session;
    }


    bind(uid: UID, cb: (err ?: Error , result ?: void) => void) {
        let self = this;
        this.__sessionService__.bind(this.id, uid, function (err) {
            if (!err) {
                self.uid = uid;
            }
            utils.invokeCallback(cb, err);
        });
    }

    unbind(uid: UID, cb: (err ?: Error , result ?: void) => void) {
        let self = this;
        this.__sessionService__.unbind(this.id, uid, function (err) {
            if (!err) {
                self.uid = null;
            }
            utils.invokeCallback(cb, err);
        });
    }

    set(key: string, value: any) {
        this.settings[key] = value;
    }

    get(key: string) {
        return this.settings[key];
    }

    push(key: string, cb: (err ?: Error , result ?: void) => void) {
        this.__sessionService__.import(this.id, key, this.get(key), cb);
    }

    pushAll(cb: (err ?: Error , result ?: void) => void) {
        this.__sessionService__.importAll(this.id, this.settings, cb);
    }

    on(event: string | symbol, listener: (...args: any[]) => void): this {
        this.__session__.on(event, listener);
        return super.on(event, listener);
    }


    abind = utils.promisify(this.bind);
    aunbind = utils.promisify(this.unbind);
    apush = utils.promisify(this.push);
    apushAll = utils.promisify(this.pushAll);

    /**
     * Export the key/values for serialization.
     *
     * @api private
     */
    export() {
        let res = {};
        clone(this, res, EXPORTED_SESSION_FIELDS);
        return res;
    }
    /**
     * 是否在线
     */
    get isOnline(): boolean {
        return this.__session__.isOnline;
    }
    /**
     * 获取客户端的地址
     */
    get remoteAddress() {
        return this.__session__.remoteAddress;
    }
}

let clone = function (src: any, dest: any, includes: any) {
    let f;
    for (let i = 0, l = includes.length; i < l; i++) {
        f = includes[i];
        dest[f] = src[f];
    }
};

let dclone = function (src: any) {
    let res: any = {};
    for (let f in src) {
        res[f] = src[f];
    }
    return res;
};
