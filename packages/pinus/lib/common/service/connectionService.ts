import { Application } from '../../application';
import { UID } from '../../util/constants';

export interface UserLoginRecord {
    loginTime: number;
    uid: UID;
    address: string;
}

/**
 * connection statistics service
 * record connection, login count and list
 */

export class ConnectionService {
    serverId: string;
    connCount = 0;
    loginedCount = 0;
    logined: {[uid: string]: UserLoginRecord} = {};


    constructor(app: Application) {
        this.serverId = app.getServerId();
    }


    /**
     * Add logined user.
     *
     * @param uid {String} user id
     * @param info {Object} record for logined user
     */
    addLoginedUser(uid: UID, info: UserLoginRecord) {
        if (!this.logined[uid]) {
            this.loginedCount++;
        }
        info.uid = uid;
        this.logined[uid] = info;
    }

    /**
     * Update user info.
     * @param uid {String} user id
     * @param info {Object} info for update.
     */
    updateUserInfo(uid: UID, info: UserLoginRecord) {
        let user = this.logined[uid];
        if (!user) {
            return;
        }

        for (let p in info) {
            if (info.hasOwnProperty(p) && typeof (info as any)[p] !== 'function') {
                (user as any)[p] = (info as any)[p];
            }
        }
    }

    /**
     * Increase connection count
     */
    increaseConnectionCount() {
        this.connCount++;
    }

    /**
     * Remote logined user
     *
     * @param uid {String} user id
     */
    removeLoginedUser(uid: UID) {
        if (!!this.logined[uid]) {
            this.loginedCount--;
        }
        delete this.logined[uid];
    }

    /**
     * Decrease connection count
     *
     * @param uid {String} uid
     */
    decreaseConnectionCount(uid: UID) {
        if (this.connCount) {
            this.connCount--;
        }
        if (!!uid) {
            this.removeLoginedUser(uid);
        }
    }

    /**
     * Get statistics info
     *
     * @return {Object} statistics info
     */
    getStatisticsInfo() {
        let list = [];
        for (let uid in this.logined) {
            list.push(this.logined[uid]);
        }

        return { serverId: this.serverId, totalConnCount: this.connCount, loginedCount: this.loginedCount, loginedList: list };
    }
}