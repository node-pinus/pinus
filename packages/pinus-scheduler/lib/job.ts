/**
 * This is the class of the job used in schedule module
 */
import * as cronTrigger from './cronTrigger';
import * as simpleTrigger from './simpleTrigger';

let jobId = 1;

let SIMPLE_JOB = 1;
let CRON_JOB  = 2;
let jobCount = 0;

let warnLimit = 500;

import { getLogger } from 'log4js';
import { SimpleTriggerOpts } from './simpleTrigger';
let logger = getLogger(__filename);


// For test
let lateCount = 0;

export class Job {
    data: any;
    func: Function;
    type: number;
    trigger: any;
    id: number;
    runTime: number;

    constructor(trigger: SimpleTriggerOpts | string, jobFunc: Function, jobData: any) {
        this.data = (!!jobData) ? jobData : null;
        this.func = jobFunc;

        if (typeof (trigger) === 'string') {
            this.type = CRON_JOB;
            this.trigger = cronTrigger.createTrigger(trigger, this);
        } else if (typeof (trigger) === 'object') {
            this.type = SIMPLE_JOB;
            this.trigger = simpleTrigger.createTrigger(trigger, this);
        }

        this.id = jobId++;
        this.runTime = 0;
    }

    /**
     * Run the job code
     */
    run() {
        try {
            jobCount++;
            this.runTime++;
            let late = Date.now() - this.excuteTime();
            if (late > warnLimit)
                logger.warn('run Job count ' + jobCount + ' late :' + late + ' lateCount ' + (++lateCount));
            this.func(this.data);
        } catch (e) {
            logger.error('Job run error for exception ! ' + e.stack);
        }
    }

    /**
     * Compute the next excution time
     */
    nextTime() {
        return this.trigger.nextExcuteTime();
    }

    excuteTime() {
        return this.trigger.excuteTime();
    }
}
/**
 * The Interface to create Job
 * @param trigger The trigger to use
 * @param jobFunc The function the job to run
 * @param jobDate The date the job use
 * @return The new instance of the give job or null if fail
 */
export function createJob(trigger: SimpleTriggerOpts | string, jobFunc: Function, jobData: any) {
  return new Job(trigger, jobFunc, jobData);
}
