/**
 * Remote session service for frontend server.
 * Set session info for backend servers.
 */
import * as utils from '../../../util/utils';
import { Application } from '../../../application';
import { SID, UID } from '../../../util/constants';

export default function(app: Application) {
  return new SessionRemote(app);
}


export class SessionRemote {
    app: Application;
    constructor(app: Application) {
        this.app = app;
    }
    bind(sid: SID, uid: UID) {
        return this.app.sessionService.abind(sid, uid);
    }

    unbind(sid: SID, uid: UID) {
        return this.app.sessionService.aunbind(sid, uid);
    }

    push(sid: SID, key: string, value: any) {
        return this.app.sessionService.aimport(sid, key, value);
    }

    pushAll(sid: SID, settings: {[key: string]: any}) {
        return this.app.sessionService.aimportAll(sid, settings);
    }

    /**
     * Get session informations with session id.
     *
     * @param  {String}   sid session id binded with the session
     * @param  {Function} cb(err, sinfo)  callback funtion, sinfo would be null if the session not exist.
     */
    async getBackendSessionBySid(sid: SID) {
        let session = this.app.sessionService.get(sid);
        if (!session) {
            return;
        }
        return session.toFrontendSession().export();
    }

    /**
     * Get all the session informations with the specified user id.
     *
     * @param  {String}   uid user id binded with the session
     * @param  {Function} cb(err, sinfo)  callback funtion, sinfo would be null if the session does not exist.
     */
    async getBackendSessionsByUid(uid: UID) {
        let sessions = this.app.sessionService.getByUid(uid);
        if (!sessions) {
            return;
        }

        let res = [];
        for (let i = 0, l = sessions.length; i < l; i++) {
            res.push(sessions[i].toFrontendSession().export());
        }
        return res;
    }

    /**
     * Kick a session by session id.
     *
     * @param  {Number}   sid session id
     * @param  {String}   reason  kick reason
     * @param  {Function} cb  callback function
     */
    kickBySid (sid: SID, reason: string) {
        return this.app.sessionService.akickBySessionId(sid, reason);
    }

    /**
     * Kick sessions by user id.
     *
     * @param  {Number|String}   uid user id
     * @param  {String}          reason     kick reason
     * @param  {Function} cb     callback function
     */
    kickByUid(uid: UID, reason: string) {
        return this.app.sessionService.kick(uid, reason);
    }
}