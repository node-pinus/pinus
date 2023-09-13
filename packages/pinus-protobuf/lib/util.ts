export function isSimpleType(type: string) {
    return (type === 'uInt32' ||
        type === 'sInt32' ||
        type === 'int32' ||
        type === 'uInt64' ||
        type === 'sInt64' ||
        type === 'float' ||
        type === 'bool' ||
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

/**
 * Check if the msg follow the defination in the protos
 */
export function checkMsgValid(msg: { [key: string]: any }, protos: { [key: string]: any }, fullProto: any) {
    if (!protos || !msg) {
        console.warn('no protos or msg exist! msg : %j, protos : %j', msg, protos);
        return false;
    }

    for (let name in protos) {
        let proto = protos[name];

        // All required element must exist
        switch (proto.option) {
            case 'required':
                if (typeof (msg[name]) === 'undefined') {
                    console.warn('no property exist for required! name: %j, proto: %j, msg: %j', name, proto, msg);
                    return false;
                }
            case 'optional':
                if (typeof (msg[name]) !== 'undefined') {
                    let message = protos.__messages[proto.type] || fullProto['message ' + proto.type];
                    if (!!message && !checkMsgValid(msg[name], message, fullProto)) {
                        console.warn('inner proto error! name: %j, proto: %j, msg: %j', name, proto, msg);
                        return false;
                    }
                }
                break;
            case 'repeated':
                // Check nest message in repeated elements
                let message = protos.__messages[proto.type] || fullProto['message ' + proto.type];
                if (!!msg[name] && !!message) {
                    for (let i = 0; i < msg[name].length; i++) {
                        if (!checkMsgValid(msg[name][i], message, fullProto)) {
                            return false;
                        }
                    }
                }
                break;
        }
    }

    return true;
}


