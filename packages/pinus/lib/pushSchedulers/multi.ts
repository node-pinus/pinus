import { IPushScheduler, ScheduleOptions, IPushSchedulerOrCtor, MultiPushSchedulerOptions, IPushSelector } from '../interfaces/IPushScheduler';
import { Application } from '../application';
import { isFunction } from 'util';
import { getLogger } from 'pinus-logger';
import { SID } from '../util/constants';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));



export class MultiPushScheduler implements IPushScheduler {
    app: Application;

    selector: IPushSelector;

    scheduler: {[id: number]: IPushScheduler};

    constructor(app: Application, opts: MultiPushSchedulerOptions) {
        opts = opts || {};
        let scheduler = opts.scheduler;
        if (Array.isArray(scheduler)) {
            this.scheduler = {};
            for(let sch of scheduler) {
                if (typeof sch.scheduler === 'function') {
                    this.scheduler[sch.id] = new sch.scheduler(app, sch.options);
                } else {
                    this.scheduler[sch.id] = sch.scheduler;
                }
            }

            if(!isFunction(opts.selector)) {
                throw new Error('MultiPushScheduler必须提供selector参数');
            }

            this.selector = opts.selector;
        }
        else {
            throw new Error('MultiPushScheduler必须提供scheduler参数');
        }

        this.app = app;
    }



    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    async start() {
        for (let k in this.scheduler) {
            let sch = this.scheduler[k];
            if (typeof sch.start === 'function') {
                await sch.start();
            }
        }
    }

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    async stop() {
        for (let k in this.scheduler) {
            let sch = this.scheduler[k];
            if (typeof sch.stop === 'function') {
                await sch.stop();
            }
        }
    }

    /**
     * Schedule how the message to send.
     *
     * @param  {Number}   reqId request id
     * @param  {String}   route route string of the message
     * @param  {Object}   msg   message content after encoded
     * @param  {Array}    recvs array of receiver's session id
     * @param  {Object}   opts  options
     */
    schedule(reqId: number, route: string, msg: any, recvs: SID[], opts: ScheduleOptions, cb: (err?: Error) => void) {
        let self = this;
        let id = self.selector(reqId, route, msg, recvs, opts);

        if (self.scheduler[id]) {
            self.scheduler[id].schedule(reqId, route, msg, recvs, opts, cb);
        } else {
            logger.error('invalid pushScheduler id, id: %j', id);
        }
    }
}