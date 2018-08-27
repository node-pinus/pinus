/**
 * [encode an uInt32, return a array of bytes]
 * @param  {[integer]} num
 * @return {[array]}
 */
export function encodeUInt32(num: any) {
    let n = parseInt(num);
    if (isNaN(n) || n < 0) {
        console.error('encodeUInt32 error n error:', n, 'origin:', num);
        return null;
    }

    let result = [];
    do {
        let tmp = n % 128;
        let next = Math.floor(n / 128);

        if (next !== 0) {
            tmp = tmp + 128;
        }
        result.push(tmp);
        n = next;
    } while (n !== 0);

    return result;
}

/**
 * [encode a sInt32, return a byte array]
 * @param  {[sInt32]} num  The sInt32 need to encode
 * @return {[array]} A byte array represent the integer
 */
export function encodeSInt32(num: any) {
    let n = parseInt(num);
    if (isNaN(n)) {
        console.error('encodeSInt32 error n error:', n, 'origin:', num);
        return null;
    }
    n = n < 0 ? (Math.abs(n) * 2 - 1) : n * 2;

    return encodeUInt32(n);
}

export function decodeUInt32(bytes: Array<any>) {
    let n = 0;

    for (let i = 0; i < bytes.length; i++) {
        let m = parseInt(bytes[i]);
        n = n + ((m & 0x7f) * Math.pow(2, (7 * i)));
        if (m < 128) {
            return n;
        }
    }

    return n;
}


export function decodeSInt32(bytes: Array<number>) {
    let n = decodeUInt32(bytes);
    let flag = ((n % 2) === 1) ? -1 : 1;

    n = ((n % 2 + n) / 2) * flag;

    return n;
}
