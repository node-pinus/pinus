/**
 * The main class and interface of the schedule module
 */
import * as PriorityQueue from './priorityQueue';
import * as Job from './job';
import { SimpleTriggerOpts } from './simpleTrigger';


import { getLogger } from 'pinus-logger';
import * as path from 'path';
let logger = getLogger('pinus-scheduler', path.basename(__filename));

let timerCount = 0;
let map: {[key: number]: Job.Job} = {};
let queue = PriorityQueue.createPriorityQueue(comparator);

let jobId = 0;
let timer: any;

// The accuracy of the scheduler, it will affect the performance when the schedule tasks are
// crowded together
let accuracy = 10;

/**
 * Schedule a new Job
 * @param trigger The trigger to use
 * @param jobFunc The function the job to run
 * @param jobData The data the job use
 * @return The job id, which can be canceled by cancelJob(id:number)
 */
function scheduleJob<T>(trigger: SimpleTriggerOpts | string, jobFunc: (data?: T) => void, jobData?: T): number {
    let job: Job.Job = Job.createJob(trigger, jobFunc, jobData);
    let excuteTime = job.excuteTime();
    let id = job.id;

    map[id] = job;
    let element = {
        id: id,
        time: excuteTime
    };

    let curJob = queue.peek();
    if (!curJob || excuteTime < curJob.time) {
        queue.offer(element);
        setTimer(job);

        return job.id;
    }

    queue.offer(element);
    return job.id;
}

/**
 * Cancel Job
 */
function cancelJob(id: number): boolean {
    let curJob = queue.peek();
    if (curJob && id === curJob.id) { // to avoid queue.peek() is null
        queue.pop();
        delete map[id];

        clearTimeout(timer);
        excuteJob();
    }
    delete map[id];
    return true;
}

/**
 * Clear last timeout and schedule the next job, it will automaticly run the job that
 * need to run now
 * @param job The job need to schedule
 * @return void
 */
function setTimer(job: Job.Job) {
    clearTimeout(timer);

    timer = setTimeout(excuteJob, job.excuteTime() - Date.now());
}

/**
 * The function used to ran the schedule job, and setTimeout for next running job
 */
function excuteJob() {
    let job = peekNextJob();
    let nextJob;

    while (!!job && (job.excuteTime() - Date.now()) < accuracy) {
        job.run();
        queue.pop();

        let nextTime = job.nextTime();

        if (nextTime === null) {
            delete map[job.id];
        } else {
            queue.offer({ id: job.id, time: nextTime });
        }
        job = peekNextJob();
    }

    // If all the job have been canceled
    if (!job)
        return;

    // Run next schedule
    setTimer(job);
}

/**
 * Return, but not remove the next valid job
 * @return Next valid job
 */
function peekNextJob() {
    if (queue.size() <= 0)
        return null;

    let job = null;

    do {
        job = map[queue.peek().id];
        if (!job) queue.pop();
    } while (!job && queue.size() > 0);

    return (!!job) ? job : null;
}

/**
 * Return and remove the next valid job
 * @return Next valid job
 */
function getNextJob() {
    let job = null;

    while (!job && queue.size() > 0) {
        let id = queue.pop().id;
        job = map[id];
    }

    return (!!job) ? job : null;
}

function comparator(e1: {time: number}, e2: {time: number}) {
    return e1.time > e2.time;
}

export
{
    scheduleJob, cancelJob
};
