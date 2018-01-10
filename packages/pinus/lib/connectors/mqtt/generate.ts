import * as protocol from './protocol';
import * as  crypto from 'crypto';

/* TODO: consider rewriting these functions using buffers instead
 * of arrays
 */

/* Publish */
export function publish(opts: any) {
    opts = opts || {};
    let dup = opts.dup ? protocol.DUP_MASK : 0;
    let qos = opts.qos || 0;
    let retain = opts.retain ? protocol.RETAIN_MASK : 0;
    let topic = opts.topic;
    let payload = opts.payload || new Buffer(0);
    let id = (typeof opts.messageId === 'undefined') ? randint() : opts.messageId;
    let packet = { header: 0, payload: [] as any[] };

    /* Check required fields */
    if (typeof topic !== 'string' || topic.length <= 0) return null;
    /* if payload is a string, we'll convert it into a buffer */
    if (typeof payload === 'string') {
        payload = new Buffer(payload);
    }
    /* accepting only a buffer for payload */
    if (!Buffer.isBuffer(payload)) return null;
    if (typeof qos !== 'number' || qos < 0 || qos > 2) return null;
    if (typeof id !== 'number' || id < 0 || id > 0xFFFF) return null;

    /* Generate header */
    packet.header = protocol.codes.publish << protocol.CMD_SHIFT | dup | qos << protocol.QOS_SHIFT | retain;

    /* Topic name */
    packet.payload = packet.payload.concat(gen_string(topic));

    /* Message ID */
    if (qos > 0) packet.payload = packet.payload.concat(gen_number(id));


    let buf = new Buffer([packet.header]
        .concat(gen_length(packet.payload.length + payload.length))
        .concat(packet.payload));

    return Buffer.concat([buf, payload]);
}

/* Requires length be a number > 0 */
let gen_length = function (length: number) {
    if (typeof length !== 'number') return null;
    if (length < 0) return null;

    let len = [];
    let digit = 0;

    do {
        digit = length % 128 | 0;
        length = length / 128 | 0;
        if (length > 0) {
            digit = digit | 0x80;
        }
        len.push(digit);
    } while (length > 0);

    return len;
};

let gen_string = function (str: string, without_length ?: boolean) { /* based on code in (from http://farhadi.ir/downloads/utf8.js) */
    if (arguments.length < 2) without_length = false;
    if (typeof str !== 'string') return null;
    if (typeof without_length !== 'boolean') return null;

    let nums: number[] = [];
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 128) {
            nums.push(code); ++length;

        } else if (code < 2048) {
            nums.push(192 + ((code >> 6))); ++length;
            nums.push(128 + ((code) & 63)); ++length;
        } else if (code < 65536) {
            nums.push(224 + ((code >> 12))); ++length;
            nums.push(128 + ((code >> 6) & 63)); ++length;
            nums.push(128 + ((code) & 63)); ++length;
        } else if (code < 2097152) {
            nums.push(240 + ((code >> 18))); ++length;
            nums.push(128 + ((code >> 12) & 63)); ++length;
            nums.push(128 + ((code >> 6) & 63)); ++length;
            nums.push(128 + ((code) & 63)); ++length;
        } else {
            throw new Error('Can\'t encode character with code ' + code);
        }
    }
    return without_length ? nums : gen_number(length).concat(nums);
};

let gen_number = function (num: number) {
    let nums: number[] = [num >> 8, num & 0x00FF];
    return nums;
};

let randint = function () { return Math.floor(Math.random() * 0xFFFF); };