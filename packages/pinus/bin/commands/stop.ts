


import * as os from 'os';
import * as program from 'commander';
import * as constants from '../../lib/util/constants';
import { connectToMaster, terminal } from '../utils/utils';
import { ConsoleModule as co } from '../../lib/modules/console';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, ADD_SERVER_INFO, CLOSEAPP_INFO, KILL_CMD_WIN, KILL_CMD_LUX } from '../utils/constants';
import { exec } from 'child_process';


export default function (program: program.CommanderStatic) {
    program.command('stop')
    .description('stop the servers, for multiple servers, use `pinus stop server-id-1 server-id-2`')
    .option('-u, --username <username>', 'administration user name', DEFAULT_USERNAME)
    .option('-p, --password <password>', 'administration password', DEFAULT_PWD)
    .option('-h, --host <master-host>', 'master server host', DEFAULT_MASTER_HOST)
    .option('-P, --port <master-port>', 'master server port', DEFAULT_MASTER_PORT)
    .action(function () {
        let args = [].slice.call(arguments, 0);
        let opts = args[args.length - 1];
        opts.serverIds = args.slice(0, -1);
        terminal('stop', opts);
    });
}