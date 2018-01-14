/**
 * backend session service for backend session
 */
import * as utils from '../../util/utils';
import { Application } from '../../application';
import { IComponent } from '../../interfaces/IComponent';
import { SID, FRONTENDID, ServerInfo } from '../../util/constants';
import { ISession } from './sessionService';

let EXPORTED_FIELDS = ['id', 'frontendId', 'uid', 'settings'];

/**
 * Service that maintains backend sessions and the communication with frontend
 * servers.
 *
 * BackendSessionService would be created in each server process and maintains
 * backend sessions for current process and communicates with the relative
 * frontend servers.
 *
 * BackendSessionService instance could be accessed by
 * `app.get('backendSessionService')` or app.backendSessionService.
 *
 * @class
 * @constructor
 */
export class BackendSessionService implements IComponent {
    app: Application;
    name: string;

    constructor(app: Application) {
        this.app = app;
    }

    create(opts: any) {
        if (!opts) {
            throw new Error('opts should not be empty.');
        }
        return new BackendSession(opts, this);
    }

    /**
     * Get backend session by frontend server id and session id.
     *
     * @param  {String}   frontendId frontend server id that session attached
     * @param  {String}   sid        session id
     * @param  {Function} cb         callback function. args: cb(err, BackendSession)
     *
     * @memberOf BackendSessionService
     */
    get(frontendId: string, sid: number, cb: (err: Error | null , result ?: BackendSession) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'getBackendSessionBySid';
        let args = [sid];
        rpcInvoke(this.app, frontendId, namespace, service, method,
            args, BackendSessionCB.bind(null, this, cb));
    }

    /**
     * Get backend sessions by frontend server id and user id.
     *
     * @param  {String}   frontendId frontend server id that session attached
     * @param  {String}   uid        user id binded with the session
     * @param  {Function} cb         callback function. args: cb(err, BackendSessions)
     *
     * @memberOf BackendSessionService
     */
    getByUid(frontendId: string, uid: string, cb: (err: Error | null , result ?: BackendSession[]) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'getBackendSessionsByUid';
        let args = [uid];
        rpcInvoke(this.app, frontendId, namespace, service, method,
            args, BackendSessionCB.bind(null, this, cb));
    }

    /**
     * Kick a session by session id.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     */
    kickBySid(frontendId: string, sid: number, cb: (err: Error | null , result ?: void) => void): void;
    kickBySid(frontendId: string, sid: number, reason: (err: Error | null , result ?: void) => void | string, cb ?: (err: Error | null , result ?: void) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'kickBySid';
        let args = [sid];
        if (typeof reason === 'function') {
            cb = reason;
        } else {
            args.push(reason);
        }
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    }

    /**
     * Kick sessions by user id.
     *
     * @param  {String}          frontendId cooperating frontend server id
     * @param  {Number|String}   uid        user id
     * @param  {String}          reason     kick reason
     * @param  {Function}        cb         callback function
     *
     * @memberOf BackendSessionService
     */
    kickByUid(frontendId: string, uid: string, reason: string, cb: (err: Error | null , result ?: void) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'kickByUid';
        let args = [uid];
        if (typeof reason === 'function') {
            cb = reason;
        } else {
            args.push(reason);
        }
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    }

    /**
     * Bind the session with the specified user id. It would finally invoke the
     * the sessionService.bind in the cooperating frontend server.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {String}   uid        user id
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    bind(frontendId: string, sid: number, uid: string, cb: (err: Error | null , result ?: void) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'bind';
        let args = [sid, uid];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    }

    /**
     * Unbind the session with the specified user id. It would finally invoke the
     * the sessionService.unbind in the cooperating frontend server.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {String}   uid        user id
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    unbind(frontendId: string, sid: number, uid: string, cb: (err: Error | null , result ?: void) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'unbind';
        let args = [sid, uid];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    }

    /**
     * Push the specified customized change to the frontend internal session.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {String}   key        key in session that should be push
     * @param  {Object}   value      value in session, primitive js object
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    push(frontendId: string, sid: number, key: string, value: string, cb: (err: Error | null , result ?: void) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'push';
        let args = [sid, key, value];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    }

    /**
     * Push all the customized changes to the frontend internal session.
     *
     * @param  {String}   frontendId cooperating frontend server id
     * @param  {Number}   sid        session id
     * @param  {Object}   settings   key/values in session that should be push
     * @param  {Function} cb         callback function
     *
     * @memberOf BackendSessionService
     * @api private
     */
    pushAll(frontendId: string, sid: number, settings: Object, cb: (err: Error | null , result ?: void) => void) {
        let namespace = 'sys';
        let service = 'sessionRemote';
        let method = 'pushAll';
        let args = [sid, settings];
        rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
    }

    aget = utils.promisify(this.get);
    agetByUid = utils.promisify(this.getByUid);
    akickBySid = utils.promisify(this.kickBySid);
    akickByUid = utils.promisify(this.kickByUid);
    abind = utils.promisify(this.bind);
    aunbind = utils.promisify(this.unbind);
    apush = utils.promisify(this.push);
    apushAll = utils.promisify(this.pushAll);
}

let rpcInvoke = function(app: Application, sid: FRONTENDID, namespace: string, service: string, method: string, args: any, cb: Function) {
  app.rpcInvoke(sid, {namespace: namespace, service: service, method: method, args: args}, cb);
};




/**
 * BackendSession is the proxy for the frontend internal session passed to handlers and
 * it helps to keep the key/value pairs for the server locally.
 * Internal session locates in frontend server and should not be accessed directly.
 *
 * The mainly operation on backend session should be read and any changes happen in backend
 * session is local and would be discarded in next request. You have to push the
 * changes to the frontend manually if necessary. Any push would overwrite the last push
 * of the same key silently and the changes would be saw in next request.
 * And you have to make sure the transaction outside if you would push the session
 * concurrently in different processes.
 *
 * See the api below for more details.
 *
 * @class
 * @constructor
 */
export class BackendSession implements ISession {
    id: number;
    uid: string;
    frontendId: string;
    settings: {[key: string]: any};
    __sessionService__: BackendSessionService;
    constructor(opts: any, service: BackendSessionService) {
        for (let f in opts) {
            (this as any)[f] = opts[f];
        }
        this.__sessionService__ = service;
    }

    /**
     * Bind current session with the user id. It would push the uid to frontend
     * server and bind  uid to the frontend internal session.
     *
     * @param  {Number|String}   uid user id
     * @param  {Function} cb  callback function
     *
     * @memberOf BackendSession
     */
    bind(uid: string, cb: (err: Error | null , result ?: void) => void) {
        let self = this;
        this.__sessionService__.bind(this.frontendId, this.id, uid, function (err) {
            if (!err) {
                self.uid = uid;
            }
            utils.invokeCallback(cb, err);
        });
    }

    /**
     * Unbind current session with the user id. It would push the uid to frontend
     * server and unbind uid from the frontend internal session.
     *
     * @param  {Number|String}   uid user id
     * @param  {Function} cb  callback function
     *
     * @memberOf BackendSession
     */
    unbind(uid: string, cb: (err: Error | null , result ?: void) => void) {
        let self = this;
        this.__sessionService__.unbind(this.frontendId, this.id, uid, function (err) {
            if (!err) {
                self.uid = null;
            }
            utils.invokeCallback(cb, err);
        });
    }

    /**
     * Set the key/value into backend session.
     *
     * @param {String} key   key
     * @param {Object} value value
     */
    set(key: string, value: any) {
        this.settings[key] = value;
    }

    /**
     * Get the value from backend session by key.
     *
     * @param  {String} key key
     * @return {Object}     value
     */
    get(key: string) {
        return this.settings[key];
    }

    /**
     * Push the key/value in backend session to the front internal session.
     *
     * @param  {String}   key key
     * @param  {Function} cb  callback function
     */
    push(key: string, cb: (err: Error | null , result ?: void) => void) {
        this.__sessionService__.push(this.frontendId, this.id, key, this.get(key), cb);
    }

    /**
     * Push all the key/values in backend session to the frontend internal session.
     *
     * @param  {Function} cb callback function
     */
    pushAll(cb: (err: Error | null , result ?: void) => void) {
        this.__sessionService__.pushAll(this.frontendId, this.id, this.settings, cb);
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
        let res: any = {};
        EXPORTED_FIELDS.forEach((field) => {
            res[field] = (this as any)[field];
        });
        return res;
    }
}

let BackendSessionCB = function(service: BackendSessionService, cb: Function, err: Error, sinfo: ServerInfo) {
  if(err) {
    utils.invokeCallback(cb, err);
    return;
  }

  if(!sinfo) {
    utils.invokeCallback(cb);
    return;
  }
  let sessions = [];
  if(Array.isArray(sinfo)) {
      // #getByUid
      for(let i = 0, k = sinfo.length; i < k; i++) {
          sessions.push(service.create(sinfo[i]));
      }
      utils.invokeCallback(cb, null, sessions);
  }
  else {
      // #get
      let session = service.create(sinfo);
      utils.invokeCallback(cb, null, session);
  }
};
