import { Job } from './job';

/**
 * This is the tirgger that use an object as trigger.
 */
let SKIP_OLD_JOB = false;

/**
 *
 //Fire 10000ms after now, and run 10 times with a 1000ms interval.
let trigger1 = {
  start : Date.now() + 10000, //Start time, use the time in date object
  period : 1000,      //Fire interval, the precision is millisecond
  count : 10          //Fire times, in this case the trigger will fire 10 times.
}

//Fire right now, and run 10 times with 1000ms interval.
let trigger2 = {
  period : 1000,
  count : 10
}

//Fire right now, and run for ever with 1000ms interval.
let trigger3 = {
  period : 1000
}

//Fire 3000ms after right now, run only once.
let trigger4 = {
  start : Date.now() + 3000;
}

//The job will fire right now, run only once.
let trigger5 = {
}

//Illegal! The 'count' attribute cannot used alone without 'period'.
let trigger6 = {
  count : 10;
}
 */
export interface SimpleTriggerOpts {
    start?: number;
    period?: number;
    count?: number;
}

/**
 * The constructor of simple trigger
 */
export class SimpleTrigger {
    nextTime: number; // Date token
    period: number;
    count: number;
    job: Job;
    constructor(trigger: SimpleTriggerOpts, job: Job) {
        this.nextTime = (!!trigger.start) ? trigger.start : Date.now();

        // The rec
        this.period = (!!trigger.period) ? trigger.period : -1;

        // The running count of the job, -1 means no limit
        this.count = (!!trigger.count) ? trigger.count : -1;

        this.job = job;
    }

    /**
     * Get the current excuteTime of rigger
     */
    excuteTime() {
        return this.nextTime;
    }

    /**
     * Get the next excuteTime of the trigger, and set the trigger's excuteTime
     * @return Next excute time
     */
    nextExcuteTime() {
        let period = this.period;

        if ((this.count > 0 && this.count <= this.job.runTime) || period <= 0)
            return null;

        this.nextTime += period;

        if (SKIP_OLD_JOB && this.nextTime < Date.now()) {
            this.nextTime += Math.floor((Date.now() - this.nextTime) / period) * period;
        }

        return this.nextTime;
    }
}
/**
 * Create Simple trigger
 */
export function createTrigger(trigger: {start?: number, period?: number, count?: number}, job: Job) {
    return new SimpleTrigger(trigger, job);
}
