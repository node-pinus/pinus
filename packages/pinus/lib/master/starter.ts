import * as cp from 'child_process';
import { getLogger } from 'pinus-logger';
import * as util from 'util';
import * as utils from '../util/utils';
import * as Constants from '../util/constants';
import * as os from 'os';
import {pinus} from '../pinus';
import { Application } from '../application';
import { ServerInfo } from '../util/constants';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));




let cpus: {[serverId: string]: number} = {};
let env: string = Constants.RESERVED.ENV_DEV;
/**
 * Run all servers
 *
 * @param {Object} app current application  context
 * @return {Void}
 */
export function runServers(app: Application) {
    let server, servers;
    let condition = app.startId || app.type;
    switch (condition) {
        case Constants.RESERVED.MASTER:
            break;
        case Constants.RESERVED.ALL:
            servers = app.getServersFromConfig();
            for (let serverId in servers) {
                run(app, servers[serverId]);
            }
            break;
        default:
            server = app.getServerFromConfig(condition);
            if (!!server) {
                run(app, server);
            } else {
                servers = app.get(Constants.RESERVED.SERVERS)[condition];
                for (let i = 0; i < servers.length; i++) {
                    run(app, servers[i]);
                }
            }
    }
}

/**
 * Run server
 *
 * @param {Object} app current application context
 * @param {Object} server
 * @return {Void}
 */
export function run(app: Application, server: ServerInfo, cb ?: (err?: string | number) => void) {
    env = app.get(Constants.RESERVED.ENV);
    let cmd, key;
    if (utils.isLocal(server.host)) {
        let options: string[] = [];
        if (!!server.args) {
            if (typeof server.args === 'string') {
                options.push(server.args.trim());
            } else {
                options = options.concat(server.args);
            }
        }
        cmd = app.get(Constants.RESERVED.MAIN);
        options.push(cmd);
        options.push(util.format('env=%s', env));
        for (key in server) {
            if (key === Constants.RESERVED.CPU) {
                cpus[server.id] = server[key];
            }
            options.push(util.format('%s=%s', key, (server as any)[key]));
        }
        localrun(process.execPath, null, options, cb);
    } else {
        cmd = util.format('cd "%s" && "%s"', app.getBase(), process.execPath);
        let arg = server.args;
        if (arg !== undefined) {
            cmd += arg;
        }
        cmd += util.format(' "%s" env=%s ', app.get(Constants.RESERVED.MAIN), env);
        for (key in server) {
            if (key === Constants.RESERVED.CPU) {
                cpus[server.id] = server[key];
            }
            cmd += util.format(' %s=%s ', key, (server as any)[key]);
        }
        sshrun(cmd, server.host, cb);
    }
}

/**
 * Bind process with cpu
 *
 * @param {String} sid server id
 * @param {String} pid process id
 * @param {String} host server host
 * @return {Void}
 */
export function bindCpu(sid: string, pid: string, host: string) {
    if (os.platform() === Constants.PLATFORM.LINUX && cpus[sid] !== undefined) {
        if (utils.isLocal(host)) {
            let options: string[] = [];
            options.push('-pc');
            options.push(String(cpus[sid]));
            options.push(pid);
            localrun(Constants.COMMAND.TASKSET, null, options);
        }
        else {
            let cmd = util.format('taskset -pc "%s" "%s"', cpus[sid], pid);
            sshrun(cmd, host, null);
        }
    }
}

/**
 * Kill application in all servers
 *
 * @param {String} pids  array of server's pid
 * @param {String} serverIds array of serverId
 */
export function kill(pids: string[], servers: ServerInfo[]) {
    let cmd;
    for (let i = 0; i < servers.length; i++) {
        let server = servers[i];
        if (utils.isLocal(server.host)) {
            let options: string[] = [];
            if (os.platform() === Constants.PLATFORM.WIN) {
                cmd = Constants.COMMAND.TASKKILL;
                options.push('/pid');
                options.push('/f');
            } else {
                cmd = Constants.COMMAND.KILL;
                options.push(String(-9));
            }
            options.push(pids[i]);
            localrun(cmd, null, options);
        } else {
            if (os.platform() === Constants.PLATFORM.WIN) {
                cmd = util.format('taskkill /pid %s /f', pids[i]);
            } else {
                cmd = util.format('kill -9 %s', pids[i]);
            }
            sshrun(cmd, server.host);
        }
    }
}

/**
 * Use ssh to run command.
 *
 * @param {String} cmd command that would be executed in the remote server
 * @param {String} host remote server host
 * @param {Function} cb callback function
 *
 */
export function sshrun(cmd: string, host: string, cb ?: (err?: string | number) => void) {
    let args = [];
    args.push(host);
    let ssh_params = pinus.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
    if (!!ssh_params && Array.isArray(ssh_params)) {
        args = args.concat(ssh_params);
    }
    args.push(cmd);

    logger.info('Executing ' + cmd + ' on ' + host + ':22');
    spawnProcess(Constants.COMMAND.SSH, host, args, cb);
    return;
}

/**
 * Run local command.
 *
 * @param {String} cmd
 * @param {Callback} callback
 *
 */
export function localrun(cmd: string, host: string, options: string[], callback ?: (err?: string | number) => void) {
    logger.info('Executing ' + cmd + ' ' + options + ' locally');
    spawnProcess(cmd, host, options, callback);
}

/**
 * Fork child process to run command.
 *
 * @param {String} command
 * @param {Object} options
 * @param {Callback} callback
 *
 */
let spawnProcess = function (command: string, host: string, options: string[], cb ?: (result: string | number) => void) {
    let child = null;

    if (env === Constants.RESERVED.ENV_DEV) {
        child = cp.spawn(command, options);
        let prefix = command === Constants.COMMAND.SSH ? '[' + host + '] ' : '';

        child.stderr.on('data', function (chunk) {
            let msg = chunk.toString();
            process.stderr.write(msg);
            if (!!cb) {
                cb(msg);
            }
        });

        child.stdout.on('data', function (chunk) {
            let msg = prefix + chunk.toString();
            process.stdout.write(msg);
        });
    } else {
        child = cp.spawn(command, options, { detached: true, stdio: 'inherit' });
        child.unref();
    }

    child.on('exit', function (code) {
        if (code !== 0) {
            logger.warn('child process exit with error, error code: %s, executed command: %s', code, command);
        }
        if (typeof cb === 'function') {
            cb(code === 0 ? null : code);
        }
    });
};