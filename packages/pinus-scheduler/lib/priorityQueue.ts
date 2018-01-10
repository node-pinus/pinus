/**
 * The PriorityQeueu class
 */
export class PriorityQueue {
    _comparator: Function;
    _queue: Array<any>;
    _tailPos: number;

    constructor(comparator: Function) {
        this.init(comparator);
    }


    init(comparator: Function) {
        this._comparator = typeof (comparator) === 'function' ? comparator : this._defaultComparator;

        this._queue = [];
        this._tailPos = 0;
    }

    /**
     * Return the size of the pirority queue
     * @return PirorityQueue size
     */
    size() {
        return this._tailPos;
    }

    /**
     * Insert an element to the queue
     * @param element The element to insert
     */
    offer(element: {id: number, time: number}) {
        let queue = this._queue;
        let compare = this._comparator;

        queue[this._tailPos++] = element;

        let pos = this._tailPos - 1;

        while (pos > 0) {
            let parentPos = (pos % 2 === 0) ? (pos / 2 - 1) : (pos - 1) / 2;
            if (compare(queue[parentPos], element)) {
                queue[pos] = queue[parentPos];
                queue[parentPos] = element;

                pos = parentPos;
            } else {
                break;
            }
        }
    }

    /**
     * Get and remove the first element in the queue
     * @return The first element
     */
    pop() {
        let queue = this._queue;
        let compare = this._comparator;

        if (this._tailPos === 0)
            return null;


        let headNode = queue[0];

        let tail = queue[this._tailPos - 1];

        let pos = 0;
        let left = pos * 2 + 1;
        let right = left + 1;
        queue[pos] = tail;
        this._tailPos--;

        while (left < this._tailPos) {
            if (right < this._tailPos && compare(queue[left], queue[right]) && compare(queue[pos], queue[right])) {
                queue[pos] = queue[right];
                queue[right] = tail;

                pos = right;
            } else if (compare(queue[pos], queue[left])) {
                queue[pos] = queue[left];
                queue[left] = tail;

                pos = left;
            } else {
                break;
            }

            left = pos * 2 + 1;
            right = left + 1;
        }

        return headNode;
    }

    /**
     * Get but not remove the first element in the queue
     * @return The first element
     */
    peek() {
        if (this._tailPos === 0)
            return null;
        return this._queue[0];
    }

    _defaultComparator = function (a: number, b: number) {
        return a > b;
    };
}

export function createPriorityQueue(comparator: Function) {
    return new PriorityQueue(comparator);
}