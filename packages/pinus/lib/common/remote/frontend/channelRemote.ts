/**
 * Remote channel service for frontend server.
 * Receive push request from backend servers and push it to clients.
 */
import * as utils from '../../../util/utils';
import { getLogger } from 'pinus-logger';
import { Application } from '../../../application';
import { UID, SID } from '../../../util/constants';
import { ScheduleOptions } from '../../../interfaces/IPushScheduler';
import { Session } from '../../service/sessionService';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));

export default function(app: Application) {
  return new ChannelRemote(app);
}

export class ChannelRemote {
    app: Application;
    constructor(app: Application) {
        this.app = app;
    }

    /**
     * Push message to client by uids.
     *
     * @param  {String}   route route string of message
     * @param  {Object}   msg   message
     * @param  {Array}    uids  user ids that would receive the message
     * @param  {Object}   opts  push options
     * @param  {Function} cb    callback function
     */
    async pushMessage(route: string, msg: any, uids: UID[], opts: ScheduleOptions) {
        return new Promise<any>((resolve, reject) => {
            if (!msg) {
                logger.error('Can not send empty message! route : %j, compressed msg : %j',
                    route, msg);
                reject(new Error('can not send empty message.'));
                return;
            }

            let connector = this.app.components.__connector__;

            let sessionService = this.app.get('sessionService');
            let fails: UID[] = [], sids: SID[] = [], sessions: Session[], j: number, k: number;
            for (let i = 0, l = uids.length; i < l; i++) {
                sessions = sessionService.getByUid(uids[i]);
                if (!sessions) {
                    fails.push(uids[i]);
                } else {
                    for (j = 0, k = sessions.length; j < k; j++) {
                        sids.push(sessions[j].id);
                    }
                }
            }
            logger.debug('[%s] pushMessage uids: %j, msg: %j, sids: %j', this.app.serverId, uids, msg, sids);
            connector.send(null, route, msg, sids, opts, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(fails);
                }
            });
        });
    }

    /**
     * Broadcast to all the client connectd with current frontend server.
     *
     * @param  {String}    route  route string
     * @param  {Object}    msg    message
     * @param  {Boolean}   opts   broadcast options.
     * @param  {Function}  cb     callback function
     */
    async broadcast(route: string, msg: any, opts: ScheduleOptions) {
        return new Promise<any>((resolve, reject) => {
            let connector = this.app.components.__connector__;

            connector.send(null, route, msg, null, opts, function (err , resp) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(resp);
                }
            });
        });
    }
}