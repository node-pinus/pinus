import { SID } from '../util/constants';
import { Application } from '../application';


export interface BroadcastOptions {
    binded: boolean ;
    filterParam: any;
}
export interface ScheduleOptions {
    type ?: 'broadcast' | 'response';
    userOptions ?: BroadcastOptions;
}

export type IPushSelector = (reqId: number, route: string, msg: any, recvs: number[], opts: any) => number;

export type IPushSchedulerOrCtor = { new(app: Application, opts?: any): IPushScheduler } | IPushScheduler;

export interface SinglePushScheduler {
    scheduler ?: IPushSchedulerOrCtor;
}

export interface MultiPushSchedulerOptions {
    scheduler ?: {id: number , scheduler: IPushSchedulerOrCtor , options: IPushSchedulerOptions}[];
    selector ?: IPushSelector;
}

export type IPushSchedulerOptions = SinglePushScheduler | MultiPushSchedulerOptions;

export interface IPushScheduler {

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    start(): Promise<void>;

    /**
     * Component lifecycle function
     *
     * @param {Boolean}  force whether stop the component immediately
     * @param {Function}  cb
     * @return {Void}
     */
    stop(): Promise<void>;

    /**
     * 调度发生时调用
     */
    schedule(reqId: number, route: string, msg: any, recvs: SID[], opts: ScheduleOptions, cb: (err?: Error) => void): void;
}