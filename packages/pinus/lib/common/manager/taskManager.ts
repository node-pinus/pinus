let sequeue = require('seq-queue');

export interface QueueTask {

}
export interface Queue {
    push(fn: (task: QueueTask) => void, ontimeout: () => void, timeoutMs: number): void;
    close(force: boolean): void;
}



let queues: {[key: number]: Queue} = {};

export let timeout = 3000;

/**
 * Add tasks into task group. Create the task group if it dose not exist.
 *
 * @param {String}   key       task key
 * @param {Function} fn        task callback
 * @param {Function} ontimeout task timeout callback
 * @param {Number}   timeout   timeout for task
 */
export function addTask(key: number, fn: (task: QueueTask) => void, ontimeout: () => void, timeoutMs: number) {
    let queue = queues[key];
    if (!queue) {
        queue = sequeue.createQueue(timeout);
        queues[key] = queue;
    }

    return queue.push(fn, ontimeout, timeoutMs);
}

/**
 * Destroy task group
 *
 * @param  {String} key   task key
 * @param  {Boolean} force whether close task group directly
 */
export function closeQueue(key: number, force: boolean) {
    if (!queues[key]) {
        // ignore illeagle key
        return;
    }

    queues[key].close(force);
    delete queues[key];
}
