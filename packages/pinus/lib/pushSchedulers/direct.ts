import * as utils from '../util/utils';
import { Application } from '../application';
import { IPushScheduler, ScheduleOptions, BroadcastOptions } from '../interfaces/IPushScheduler';
import { SID } from '../util/constants';

export class DirectPushScheduler implements IPushScheduler {
    async start() {
    }
    async stop() {
    }
    app: Application;
    constructor(app: Application, opts ?: {}) {
        opts = opts || {};
        this.app = app;
    }


    schedule(reqId: number, route: string, msg: any, recvs: SID[], opts: ScheduleOptions, cb: (err?: Error) => void) {
        opts = opts || {};
        if (opts.type === 'broadcast') {
            this.doBroadcast(msg, opts.userOptions);
        } else {
            this.doBatchPush(msg, recvs);
        }

        if (cb) {
            process.nextTick(function () {
                utils.invokeCallback(cb);
            });
        }
    }

    doBroadcast(msg: any, opts: BroadcastOptions) {
        let channelService = this.app.get('channelService');
        let sessionService = this.app.get('sessionService');

        if (opts.binded) {
            sessionService.forEachBindedSession(function (session) {
                if (channelService.broadcastFilter &&
                    !channelService.broadcastFilter(session, msg, opts.filterParam)) {
                    return;
                }

                sessionService.sendMessageByUid(session.uid, msg);
            });
        } else {
            sessionService.forEachSession(function (session) {
                if (channelService.broadcastFilter &&
                    !channelService.broadcastFilter(session, msg, opts.filterParam)) {
                    return;
                }

                sessionService.sendMessage(session.id, msg);
            });
        }
    }

    doBatchPush(msg: any, recvs: SID[]) {
        let sessionService = this.app.get('sessionService');
        for (let i = 0, l = recvs.length; i < l; i++) {
            sessionService.sendMessage(recvs[i], msg);
        }
    }

}