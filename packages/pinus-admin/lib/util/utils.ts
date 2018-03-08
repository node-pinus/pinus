import * as crypto from 'crypto';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { ServerInfo, AdminUserInfo } from './constants';


/**
 * Check and invoke callback
 */
export function invokeCallback (cb: Function , ...args: any[]) {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
}

/*
 * Date format
 */
export function format(date: Date, format ?: string) {
    format = format || 'MM-dd-hhmm';
    let o: any = {
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
            format = format.replace(RegExp.$1,
                RegExp.$1.length === 1 ? o[k] :
                    ('00' + o[k]).substr(('' + o[k]).length));
        }
    }

    return format;
}

export function compareServer(server1: ServerInfo, server2: ServerInfo) {
    return (server1['host'] === server2['host']) &&
        (server1['port'] === server2['port']);
}

/**
 * Get the count of elements of object
 */
export function size(obj: any, type ?: string) {
    let count = 0;
    for (let i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            if (!type) {
                count++;
                continue;
            }

            if (type && type === obj[i]['type']) {
                count++;
            }
        }
    }
    return count;
}

export function md5(str: string) {
    let md5sum = crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
}

export function defaultAuthUser(msg: {username: string, password: string, md5: string}, env: string, cb: (user: AdminUserInfo) => void) {
    let adminUser = null;
    let appBase = process.cwd();
    let adminUserPath = path.join(appBase, '/config/adminUser.json');
    let presentPath = path.join(appBase, 'config', env, 'adminUser.json');
    if (fs.existsSync(adminUserPath)) {
        adminUser = require(adminUserPath);
    } else if (fs.existsSync(presentPath)) {
        adminUser = require(presentPath);
    } else {
        cb(null);
        return;
    }
    let username = msg['username'];
    let password = msg['password'];
    let md5Str = msg['md5'];

    let len = adminUser.length;
    if (md5Str) {
        for (let i = 0; i < len; i++) {
            let user = adminUser[i];
            let p = '';
            if (user['username'] === username) {
                p = md5(user['password']);
                if (password === p) {
                    cb(user);
                    return;
                }
            }
        }
    } else {
        for (let i = 0; i < len; i++) {
            let user = adminUser[i];
            if (user['username'] === username && user['password'] === password) {
                cb(user);
                return;
            }
        }
    }
    cb(null);
}

export function defaultAuthServerMaster(msg: {id: string, serverType: string, token: string}, env: string, cb: (result: 'ok' | 'bad') => void) {
    let id = msg['id'];
    let type = msg['serverType'];
    let token = msg['token'];
    if (type === 'master') {
        cb('ok');
        return;
    }

    let servers = null;
    let appBase = process.cwd();
    let serverPath = path.join(appBase, '/config/adminServer.json');
    let presentPath = null;
    if (env) {
        presentPath = path.join(appBase, 'config', env, 'adminServer.json');
    }

    if (fs.existsSync(serverPath)) {
        servers = require(serverPath);
    } else if (fs.existsSync(presentPath)) {
        servers = require(presentPath);
    } else {
        cb('ok');
        return;
    }

    let len = servers.length;
    for (let i = 0; i < len; i++) {
        let server = servers[i];
        if (server['type'] === type && server['token'] === token) {
            cb('ok');
            return;
        }
    }
    cb('bad');
    return;
}

export function defaultAuthServerMonitor(msg: {id: string, serverType: string}, env: string, cb: (result: 'ok' | 'bad') => void) {
    let id = msg['id'];
    let type = msg['serverType'];

    let servers = null;
    let appBase = process.cwd();
    let serverPath = path.join(appBase, '/config/adminServer.json');
    let presentPath = null;
    if (env) {
        presentPath = path.join(appBase, 'config', env, 'adminServer.json');
    }

    if (fs.existsSync(serverPath)) {
        servers = require(serverPath);
    } else if (fs.existsSync(presentPath)) {
        servers = require(presentPath);
    } else {
        cb('ok');
        return;
    }

    let len = servers.length;
    for (let i = 0; i < len; i++) {
        let server = servers[i];
        if (server['type'] === type) {
            cb(server['token']);
            return;
        }
    }
    cb(null);
    return;
}