
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as cliff from 'cliff';
import * as mkdirp from 'mkdirp';
import { FILEREAD_ERROR, CONNECT_ERROR, MASTER_HA_NOT_FOUND, CLOSEAPP_INFO, KILL_CMD_WIN, KILL_CMD_LUX } from './constants';
import * as utils from '../../lib/util/utils';
import * as starter from '../../lib/master/starter';
import * as constants from '../../lib/util/constants';
import { AdminClient } from 'pinus-admin';
import { exec } from 'child_process';
import { ConsoleModule as co } from '../../lib/modules/console';

export let version = require('../../../package.json').version;

export function connectToMaster(id: string, opts: any, cb: (client: AdminClient) => void) {
    let client = new AdminClient({ username: opts.username, password: opts.password, md5: true });
    client.connect(id, opts.host, opts.port, function (err) {
        if (err) {
            abort(CONNECT_ERROR + err.red);
        }
        if (typeof cb === 'function') {
            cb(client);
        }
    });
}

/**
 * Prompt confirmation with the given `msg`.
 *
 * @param {String} msg
 * @param {Function} fn
 */
export function confirm(msg: string, fn: Function) {
    prompt(msg, function (val: string) {
        fn(/^ *y(es)?/i.test(val));
    });
}

/**
 * Prompt input with the given `msg` and callback `fn`.
 *
 * @param {String} msg
 * @param {Function} fn
 */
export function prompt(msg: string, fn: Function) {
    if (' ' === msg[msg.length - 1]) {
        process.stdout.write(msg);
    } else {
        console.log(msg);
    }
    process.stdin.setEncoding('ascii');
    process.stdin.once('data', function (data) {
        fn(data);
    }).resume();
}

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
export function abort(str: string) {
    console.error(str);
    process.exit(1);
}

/**
 * Run server.
 *
 * @param {Object} server server information
 */
export function runServer(server: any) {
    let cmd, key;
    let main = path.resolve(server.home, 'app.js');
    if (utils.isLocal(server.host)) {
        let options = [];
        options.push(main);
        for (key in server) {
            options.push(util.format('%s=%s', key, server[key]));
        }
        starter.localrun(process.execPath, null, options);
    } else {
        cmd = util.format('cd "%s" && "%s"', server.home, process.execPath);
        cmd += util.format(' "%s" ', main);
        for (key in server) {
            cmd += util.format(' %s=%s ', key, server[key]);
        }
        starter.sshrun(cmd, server.host);
    }
}

/**
 * Terminal application.
 *
 * @param {String} signal stop/kill
 * @param {Object} opts options for `stop/kill` operation
 */
export function terminal(signal: string, opts: any) {
    console.info(CLOSEAPP_INFO);
    // option force just for `kill`
    if (opts.force) {
        if (os.platform() === constants.PLATFORM.WIN) {
            exec(KILL_CMD_WIN);
        } else {
            exec(KILL_CMD_LUX);
        }
        process.exit(1);
        return;
    }
    let id = 'pinus_terminal_' + Date.now();
    connectToMaster(id, opts, function (client) {
        client.request(co.moduleId, {
            signal: signal, ids: opts.serverIds
        }, function (err, msg) {
                if (err) {
                    console.error(err);
                }
                if (signal === 'kill') {
                    if (msg.code === 'ok') {
                        console.log('All the servers have been terminated!');
                    } else {
                        console.log('There may be some servers remained:', msg.serverIds);
                    }
                }
                process.exit(0);
            });
    });
}