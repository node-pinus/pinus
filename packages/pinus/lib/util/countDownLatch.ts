
export interface CountDownLatchOptions {
    timeout ?: number;
}

export type CountDownLatchCallback = (isTimeout ?: boolean) => void;

/**
 * Count down to zero or timeout and invoke cb finally.
 */
export class CountDownLatch {
    count: number;
    cb: CountDownLatchCallback;
    timerId: any;
    constructor(count: number, opts: CountDownLatchOptions, cb: CountDownLatchCallback) {
        this.count = count;
        this.cb = cb;
        let self = this;
        if (opts.timeout) {
            this.timerId = setTimeout(function () {
                self.cb(true);
            }, opts.timeout);
        }
    }

    /**
     * Call when a task finish to count down.
     *
     * @api public
     */
    done() {
        if (this.count <= 0) {
            throw new Error('illegal state.');
        }

        this.count--;
        if (this.count === 0) {
            if (this.timerId) {
                clearTimeout(this.timerId);
            }
            this.cb();
        }
    }
}

/**
 * Create a count down latch
 *
 * @param {Integer} count
 * @param {Object} opts, opts.timeout indicates timeout, optional param
 * @param {Function} cb, cb(isTimeout)
 *
 * @api public
 */
export function createCountDownLatch(count: number, cb ?: CountDownLatchCallback): CountDownLatch;
export function createCountDownLatch(count: number, opts:  CountDownLatchOptions, cb ?: CountDownLatchCallback): CountDownLatch;
export function createCountDownLatch(count: number, opts ?: CountDownLatchCallback | CountDownLatchOptions, cb ?: CountDownLatchCallback) {
  if(!count || count <= 0) {
    throw new Error('count should be positive.');
  }

  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  if(typeof cb !== 'function') {
    throw new Error('cb should be a function.');
  }

  return new CountDownLatch(count, opts as CountDownLatchOptions, cb);
}
