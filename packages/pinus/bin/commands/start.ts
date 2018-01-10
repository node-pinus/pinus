


import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as program from 'commander';
import * as constants from '../../lib/util/constants';
import { connectToMaster, abort } from '../utils/utils';
import { ConsoleModule as co } from '../../lib/modules/console';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, ADD_SERVER_INFO, CLOSEAPP_INFO, KILL_CMD_WIN, KILL_CMD_LUX, DEFAULT_ENV, DEFAULT_GAME_SERVER_DIR, SCRIPT_NOT_FOUND, DAEMON_INFO } from '../utils/constants';
import { exec, spawn } from 'child_process';



export default function (program: program.CommanderStatic) {
    program.command('start')
    .description('start the application')
    .option('-e, --env <env>', 'the used environment', DEFAULT_ENV)
    .option('-D, --daemon', 'enable the daemon start')
    .option('-d, --directory, <directory>', 'the code directory', DEFAULT_GAME_SERVER_DIR)
    .option('-t, --type <server-type>,', 'start server type')
    .option('-i, --id <server-id>', 'start server id')
    .action(function (opts) {
        start(opts);
    });
}
/**
 * Start application.
 *
 * @param {Object} opts options for `start` operation
 */
function start(opts: any) {
    let absScript = path.resolve(opts.directory, 'app.js');
    if (!fs.existsSync(absScript)) {
        abort(SCRIPT_NOT_FOUND);
    }

    let logDir = path.resolve(opts.directory, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    let ls;
    let type = opts.type || constants.RESERVED.ALL;
    let params = [absScript, 'env=' + opts.env, 'type=' + type];
    if (!!opts.id) {
        params.push('startId=' + opts.id);
    }
    if (opts.daemon) {
        ls = spawn(process.execPath, params, { detached: true, stdio: 'ignore' });
        ls.unref();
        console.log(DAEMON_INFO);
        process.exit(0);
    } else {
        ls = spawn(process.execPath, params);
        ls.stdout.on('data', function (data) {
            console.log(data.toString());
        });
        ls.stderr.on('data', function (data) {
            console.log(data.toString());
        });
    }
}