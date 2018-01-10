
export function isSimpleType(type: string) {
    return (type === 'uInt32' ||
        type === 'sInt32' ||
        type === 'int32' ||
        type === 'uInt64' ||
        type === 'sInt64' ||
        type === 'float' ||
        type === 'double');
}

export function equal(obj0: { [key: string]: any }, obj1: { [key: string]: any }) {
    for (let key in obj0) {
        let m = obj0[key];
        let n = obj1[key];

        if (typeof (m) === 'object') {
            if (!equal(m, n)) {
                return false;
            }
        } else if (m !== n) {
            return false;
        }
    }

    return true;
}