


import * as program from 'commander';
import { connectToMaster, terminal } from '../utils/utils';
import { ConsoleModule as co } from '../../lib/modules/console';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, ADD_SERVER_INFO } from '../utils/constants';

export default function (program: program.CommanderStatic) {
    program.command('kill')
    .description('kill the application')
    .option('-u, --username <username>', 'administration user name', DEFAULT_USERNAME)
    .option('-p, --password <password>', 'administration password', DEFAULT_PWD)
    .option('-h, --host <master-host>', 'master server host', DEFAULT_MASTER_HOST)
    .option('-P, --port <master-port>', 'master server port', DEFAULT_MASTER_PORT)
    .option('-f, --force', 'using this option would kill all the node processes')
    .action(function () {
        let args = [].slice.call(arguments, 0);
        let opts = args[args.length - 1];
        opts.serverIds = args.slice(0, -1);
        terminal('kill', opts);
    });
}