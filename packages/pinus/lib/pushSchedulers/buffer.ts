import * as utils from '../util/utils';
import { Application } from '../application';
import { SID } from '../util/constants';
import { ScheduleOptions, BroadcastOptions } from '../interfaces/IPushScheduler';
import { Session } from '../index';
let DEFAULT_FLUSH_INTERVAL = 20;

export interface BufferPushSchedulerOptions {
    flushInterval?: number;
}

export class BufferPushScheduler {
    app: Application;
    flushInterval: number;
    sessions: { [sid: number]: Session[] } = {};   // sid -> msg queue
    tid: NodeJS.Timer = null;

    constructor(app: Application, opts?: BufferPushSchedulerOptions) {

        opts = opts || {};
        this.app = app;
        this.flushInterval = opts.flushInterval || DEFAULT_FLUSH_INTERVAL;
    }

    async start() {
        this.tid = setInterval(this.flush.bind(this), this.flushInterval);
    }

    async stop() {
        if (this.tid) {
            clearInterval(this.tid);
            this.tid = null;
        }
    }

    schedule(reqId: number, route: string, msg: any, recvs: SID[], opts: ScheduleOptions, cb: () => void) {
        opts = opts || {};
        if (opts.type === 'broadcast') {
            this.doBroadcast( msg, opts.userOptions);
        } else {
            this.doBatchPush( msg, recvs);
        }

        process.nextTick(function () {
            utils.invokeCallback(cb);
        });
    }

    flush() {
        let sessionService = this.app.get('sessionService');
        let queue, session;
        for (let sid in this.sessions) {
            session = sessionService.get(Number(sid));
            if (!session) {
                continue;
            }

            queue = this.sessions[sid];
            if (!queue || queue.length === 0) {
                continue;
            }

            session.sendBatch(queue);
            this.sessions[sid] = [];
        }
    }


    doBroadcast(msg: any, opts: BroadcastOptions) {
        let channelService = this.app.get('channelService');
        let sessionService = this.app.get('sessionService');

        if (opts.binded) {
            sessionService.forEachBindedSession( (session) => {
                if (channelService.broadcastFilter &&
                    !channelService.broadcastFilter(session, msg, opts.filterParam)) {
                    return;
                }

                this.enqueue( session, msg);
            });
        } else {
            sessionService.forEachSession( (session) => {
                if (channelService.broadcastFilter &&
                    !channelService.broadcastFilter(session, msg, opts.filterParam)) {
                    return;
                }

                this.enqueue( session, msg);
            });
        }
    }
    doBatchPush(msg: any, recvs: SID[]) {
        let sessionService = this.app.get('sessionService');
        let session;
        for (let i = 0, l = recvs.length; i < l; i++) {
            session = sessionService.get(recvs[i]);
            if (session) {
                this.enqueue( session, msg);
            }
        }
    }

    enqueue(session: Session, msg: any) {
        let queue = this.sessions[session.id];
        if (!queue) {
            queue = this.sessions[session.id] = [];
            session.once('closed', this.onClose.bind(this));
        }

        queue.push(msg);
    }

    onClose(session: Session) {
        delete this.sessions[session.id];
    }
}