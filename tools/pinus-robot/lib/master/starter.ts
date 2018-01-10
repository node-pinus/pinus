import * as  cp from 'child_process';
import * as fs from 'fs';
import * as vm from 'vm';
import * as path from 'path';
import * as util from 'util';

import 'cliff';

export function run(main: string, message: any, clients: Array<any>) {
    if (!clients) {
        clients = ['127.0.0.1'];
        prepare(main, message, clients);
    } else {
        prepare(main, message, clients);
    }
}

export function prepare(main: string, message: { agent: any }, clients: Array<any>) {
    let count = parseInt(message.agent, 10) || 1;
    for (let ipindex in clients) {
        for (let i = 0; i < count; i++) {
            let cmd = `"${process.execPath}" ${main}`;
            let ip = clients[ipindex];
            if (ip === '127.0.0.1') {
                localrun(cmd);
            } else {
                sshrun(cmd, ip);
            }
        }
    }
}

export function sshrun(cmd: string, host: number | string, callback?: Function) {
    let hosts = [host];
    log('Executing ' + (<any>cmd).yellow + ' on ' + (<any>hosts.join(', ')).blue);
    let wait = 0;
    let data: Array<{ host: number | string, out: any }> = [];
    if (hosts.length > 1) {
        starter.parallelRunning = true;
    }
    hosts.forEach(function (host) {
        wait += 1;
        spawnProcess('ssh', [host, cmd], function (err: Error, out: any) {
            if (!err) {
                data.push({
                    host: host,
                    out: out
                });
            }
            done(err);
        });
    });

    let error: Error;
    function done(err: Error) {
        error = error || err;
        if (--wait === 0) {
            starter.parallelRunning = false;
            if (error) {
                abort('FAILED TO RUN, return code: ' + error);
            } else if (callback) {
                callback(data);
            }
        }
    }

}

export function localrun(cmd: string, callback?: Function) {
    log('Executing ' + (<any>cmd).green + ' locally');
    spawnProcess(cmd, ['', ''], function (err: Error, data: string) {
        if (err) {
            abort('FAILED TO RUN, return code: ' + err);
        } else {
            if (callback) callback(data);
        }
    });
}

let starter = new class { parallelRunning: boolean; };

export function set(key: number, def: string) {
    if (typeof def === 'function') {
        (starter as any).__defineGetter__(key, def);
    } else {
        (starter as any).__defineGetter__(key, function () {
            return def;
        });
    }
}

export function load(file: string) {
    if (!file) throw new Error('File not specified');
    log('Executing compile ' + file);
    let code = fs.readFileSync(file).toString();
    vm.runInNewContext(code, starter);
}

export function abort(msg: string) {
    log((<any>msg).red);
    // process.exit(1);
}


let log = console.log;

/**
 *begin notify to run agent
 *
 *
 */

function addBeauty(prefix: string, buf: string) {
    let out = prefix + ' ' + buf
        .toString()
        .replace(/\s+$/, '')
        .replace(/\n/g, '\n' + prefix);
    return (<any>out).green;
}

function spawnProcess(command: string, options: Array<any>, callback: Function) {
    let child = null;
    if (!!options[0]) {
        child = cp.spawn(command, options);

    } else {
        child = cp.exec(command, options as any);
    }

    let prefix = command === 'ssh' ? '[' + options[0] + '] ' : '';
    prefix = (<any>prefix).grey;

    // child.stderr.on('data', function (chunk) {
    //    log(addBeauty(chunk));
    // });

    let res: Array<any> = [];
    child.stdout.on('data', function (chunk: any) {
        res.push(chunk.toString());
        log(addBeauty(chunk));
    });

    function addBeauty(buf: string) {
        return prefix + buf
            .toString()
            .replace(/\s+$/, '')
            .replace(/\n/g, '\n' + prefix);
    }

    child.on('exit', function (code: number) {
        if (callback) {
            callback(code === 0 ? null : code, res && res.join('\n'));
        }
    });
}

