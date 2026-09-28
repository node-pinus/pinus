import * as os from 'os';
import * as util from 'util';
import {exec} from 'child_process';
import {getLogger} from 'pinus-logger';
import * as Constants from './constants';
import {ServerInfo} from './constants';
import {Application} from '../application';
import * as path from 'path';
import { pinus } from '../pinus';

let logger = getLogger('pinus', path.basename(__filename));

export interface CheckPortDetail {
    host: string;
    /** 被判定占用的端口。注意经 pinus add 传入时其实是字符串（console.ts parseArgs 不做类型转换） */
    port: number | string;
    /** 命中的本地地址（如 0.0.0.0:9992），用于日志与报错文案 */
    addresses: string[];
}


/**
 * Invoke callback with check
 */
export function invokeCallback(cb: Function, ...args: any[]) {
    if (typeof cb === 'function') {
        let len = args.length + 1;
        if (len === 1) {
            return cb();
        }

        if (len === 2) {
            return cb(args[0]);
        }

        if (len === 3) {
            return cb(args[0], args[1]);
        }

        if (len === 4) {
            return cb(args[0], args[1], args[2]);
        }
        cb.apply(null, args);
        // cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
}

/**
 * Get the count of elements of object
 */
export function size(obj: any) {
    let count = 0;
    for (let i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
}

/**
 * Check a string whether ends with another string
 */
export function endsWith(str: string, suffix: string) {
    if (typeof str !== 'string' || typeof suffix !== 'string' ||
        suffix.length > str.length) {
        return false;
    }
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/**
 * Check a string whether starts with another string
 */
export function startsWith(str: string, prefix: string) {
    if (typeof str !== 'string' || typeof prefix !== 'string' ||
        prefix.length > str.length) {
        return false;
    }

    return str.indexOf(prefix) === 0;
}

/**
 * Compare the two arrays and return the difference.
 */
export function arrayDiff<T extends string>(array1: Array<T>, array2: Array<T>) {
    let o: { [key: string]: boolean } = {};
    for (let i = 0, len = array2.length; i < len; i++) {
        o[array2[i]] = true;
    }

    let result = [];
    for (let i = 0, len = array1.length; i < len; i++) {
        let v = array1[i];
        if (o[v]) continue;
        result.push(v);
    }
    return result;
}

/*
 * Date format
 */
export function format(date: Date, format ?: string) {
    format = format || 'MMddhhmm';
    let o = {
        'M+': date.getMonth() + 1, // month
        'd+': date.getDate(), // day
        'h+': date.getHours(), // hour
        'm+': date.getMinutes(), // minute
        's+': date.getSeconds(), // second
        'q+': Math.floor((date.getMonth() + 3) / 3), // quarter
        'S': date.getMilliseconds() // millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }

    for (let k in o) {
        if (new RegExp('(' + k + ')').test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? (o as any)[k] :
                ('00' + (o as any)[k]).substr(('' + (o as any)[k]).length));
        }
    }
    return format;
}

/**
 * check if has Chinese characters.
 */
export function hasChineseChar(str: string) {
    if (/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
        return true;
    } else {
        return false;
    }
}

/**
 * transform unicode to utf8
 */
export function unicodeToUtf8(str: string) {
    let i, len, ch;
    let utf8Str = '';
    len = str.length;
    for (i = 0; i < len; i++) {
        ch = str.charCodeAt(i);

        if ((ch >= 0x0) && (ch <= 0x7F)) {
            utf8Str += str.charAt(i);

        } else if ((ch >= 0x80) && (ch <= 0x7FF)) {
            utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x800) && (ch <= 0xFFFF)) {
            utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x10000) && (ch <= 0x1FFFFF)) {
            utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF)) {
            utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF)) {
            utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        }

    }
    return utf8Str;
}

/**
 * Ping server to check if network is available
 *
 */
export function ping(host: string, cb: (ret: boolean) => void) {
    if (!isLocal(host)) {
        let cmd = 'ping -w 15 ' + host;
        exec(cmd, function (err, stdout, stderr) {
            if (!!err) {
                cb(false);
                return;
            }
            cb(true);
        });
    } else {
        cb(true);
    }
}

export function getBusyAddresses(netstatOutput: string, port: number | string): string[] {
    let target = String(port);
    let busy: string[] = [];
    let lines = String(!!netstatOutput ? netstatOutput : '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        let addr = lines[i].trim();
        if (!addr) {
            continue;
        }
        // 端口是地址的最后一段：IPv4 用 '.' 分隔，IPv6 用 ':' 分隔
        let segment = addr.split(/[:.]/).pop();
        if (segment === target) {
            busy.push(addr);
        }
    }
    return busy;
}

export function formatPortOccupiedMessage(detail?: CheckPortDetail) {
    let base = 'Port occupied already';
    if (!!detail && detail.addresses.length > 0) {
        base += util.format('(%s on %s)', detail.addresses.join(','), detail.host);
    }
    return base + ', check your server to add.';
}

/**
 * Check if server is exsit.
 *
 */
export function checkPort(app: Application, server: ServerInfo, cb: (result: string, detail?: CheckPortDetail) => void) {
    if (!server.port && !server.clientPort) {
        invokeCallback(cb, 'leisure');
        return;
    }
    const host = server.host;
    const primaryPort = server.port || server.clientPort;
    const clientPort = server.clientPort;
    const generateCommand = function (host: string) {
        let cmd;
        let ssh_params = app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
        if (!!ssh_params && Array.isArray(ssh_params)) {
            ssh_params = ssh_params.join(' ');
        }
        else {
            ssh_params = '';
        }
        if (!isLocal(host)) {
            cmd = util.format('ssh %s %s "netstat -tlnp|awk \'{print $4}\'"', host, ssh_params);
        } else {
            cmd = 'netstat -tlnp|awk \'{print $4}\'';
        }
        return cmd;
    };
    const check = function (port: number | string, next: (busy: string[]) => void) {
        const cmd = generateCommand(host);
        exec(cmd, function (err, stdout, stderr) {
            if (err) {
                logger.error('command %s execute with error: %j', cmd, err.stack);
                invokeCallback(cb, 'error');
                return;
            }
            let busy = getBusyAddresses(stdout, port);
            if (busy.length > 0) {
                logger.warn('checkPort: port %s on %s is occupied, matched: %s', port, host, busy.join(','));
            }
            next(busy);
        });
    };
    check(primaryPort, function (busy) {
        if (busy.length > 0) {
            invokeCallback(cb, 'busy', { host: host, port: primaryPort, addresses: busy });
            return;
        }
        if (!clientPort) {
            invokeCallback(cb, 'leisure');
            return;
        }
        check(clientPort, function (busyClientPort) {
            if (busyClientPort.length > 0) {
                invokeCallback(cb, 'busy', { host: host, port: clientPort, addresses: busyClientPort });
                return;
            }
            invokeCallback(cb, 'leisure');
        });
    });
}

export function isLocal(host: string) {
    const app = pinus.app;
    if (!app) {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host);
    } else {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host) || host === app.master.host;
    }
}

/**
 * Load cluster server.
 *
 */
export function loadCluster(app: Application, server: ServerInfo, serverMap: { [serverId: string]: ServerInfo }) {
    let increaseFields: { [key: string]: string } = {};
    let host = server.host;
    let count = Number(server[Constants.RESERVED.CLUSTER_COUNT]);
    let seq = app.clusterSeq[server.serverType];
    if (!seq) {
        seq = 0;
        app.clusterSeq[server.serverType] = count;
    } else {
        app.clusterSeq[server.serverType] = seq + count;
    }

    for (let key in server) {
        let value = (server as any)[key].toString();
        if (value.indexOf(Constants.RESERVED.CLUSTER_SIGNAL) > 0) {
            let base = (server as any)[key].slice(0, -2);
            increaseFields[key] = base;
        }
    }

    let clone = function (src: any) {
        let rs: any = {};
        for (let key in src) {
            rs[key] = src[key];
        }
        return rs;
    };
    for (let i = 0, l = seq; i < count; i++ , l++) {
        let cserver = clone(server);
        cserver.id = Constants.RESERVED.CLUSTER_PREFIX + server.serverType + '-' + l;
        for (let k in increaseFields) {
            let v = parseInt(increaseFields[k]);
            cserver[k] = v + i;
        }
        serverMap[cserver.id] = cserver;
    }
}

// export function extends(origin, add)
// {
//    if (!add || !this.isObject(add)) return origin;

//    let keys = Object.keys(add);
//    let i = keys.length;
//    while (i--)
//    {
//        origin[keys[i]] = add[keys[i]];
//    }
//    return origin;
// };

export function headHandler(headBuffer: Buffer) {
    let len = 0;
    for (let i = 1; i < 4; i++) {
        if (i > 1) {
            len <<= 8;
        }
        len += headBuffer.readUInt8(i);
    }
    return len;
}

let inLocal = function (host: string) {
    for (let index in localIps) {
        if (host === localIps[index]) {
            return true;
        }
    }
    return false;
};

let localIps = function () {
    let ifaces = os.networkInterfaces();
    let ips: string[] = [];
    let func = function (details: os.NetworkInterfaceInfo) {
        if (details.family === 'IPv4') {
            ips.push(details.address);
        }
    };
    for (let dev in ifaces) {
        ifaces[dev].forEach(func);
    }
    return ips;
}();

export function isObject(arg: any) {
    return typeof arg === 'object' && arg !== null;
}

export function extendsObject(origin: any, add: any) {
    if (!add || !isObject(add)) return origin;

    let keys = Object.keys(add);
    let i = keys.length;
    while (i--) {
        origin[keys[i]] = add[keys[i]];
    }
    return origin;
}

export let promisify = util.promisify;
