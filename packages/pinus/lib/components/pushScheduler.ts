/**
 * Scheduler component to schedule message sending.
 */

import {DirectPushScheduler as DefaultScheduler} from '../pushSchedulers/direct';
import { getLogger } from 'pinus-logger';
import { Application } from '../application';
import { IComponent } from '../interfaces/Component';
import { IPushScheduler, ScheduleOptions } from '../interfaces/IPushScheduler';
import { MultiPushScheduler, MultiPushSchedulerOptions } from '../pushSchedulers/multi';
import { SID } from '../util/constants';
let logger = getLogger('pinus', __filename);


export interface PushSchedulerComponentOptions
{
    scheduler ?: {new (app : Application, opts ?:any):IPushScheduler} | IPushScheduler;
}

export class PushSchedulerComponent implements IComponent
{
    scheduler : IPushScheduler;
    constructor(private app : Application, opts ?: PushSchedulerComponentOptions | MultiPushSchedulerOptions)
    {
        opts = opts || {};
        this.scheduler = getScheduler(this, app, opts);
    };

    name = '__pushScheduler__';

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    afterStart(cb : ()=>void)
    {
        this.scheduler.start().then(cb);
    };

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    stop(force : boolean, cb : ()=>void)
    {
        this.scheduler.stop().then(cb);
    };

    /**
     * Schedule how the message to send.
     *
     * @param  {Number}   reqId request id
     * @param  {String}   route route string of the message
     * @param  {Object}   msg   message content after encoded
     * @param  {Array}    recvs array of receiver's session id
     * @param  {Object}   opts  options
     * @param  {Function} cb
     */
    schedule(reqId : number, route : string, msg : any, recvs : SID[], opts : ScheduleOptions, cb : (err?:Error)=>void)
    {
        this.scheduler.schedule(reqId, route, msg, recvs, opts, cb);     
    };
}
let getScheduler = function (pushSchedulerComp : PushSchedulerComponent, app : Application, opts : PushSchedulerComponentOptions | MultiPushSchedulerOptions) : IPushScheduler
{
    let scheduler = opts.scheduler || DefaultScheduler;
    if (typeof scheduler === 'function')
    {
        return new scheduler(app, opts);
    }

    if (Array.isArray(scheduler))
    {
        return new MultiPushScheduler(app , opts as any);
    }

    return scheduler as IPushScheduler;
};
