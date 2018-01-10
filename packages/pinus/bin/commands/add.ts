

import * as program from 'commander';
import { connectToMaster } from '../utils/utils';
import { ConsoleModule as co } from '../../lib/modules/console';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, ADD_SERVER_INFO } from '../utils/constants';

export default function (program: program.CommanderStatic) {
    program.command('add')
        .description('add a new server')
        .option('-u, --username <username>', 'administration user name', DEFAULT_USERNAME)
        .option('-p, --password <password>', 'administration password', DEFAULT_PWD)
        .option('-h, --host <master-host>', 'master server host', DEFAULT_MASTER_HOST)
        .option('-P, --port <master-port>', 'master server port', DEFAULT_MASTER_PORT)
        .action(function () {
            let args = [].slice.call(arguments, 0);
            let opts = args[args.length - 1];
            opts.args = args.slice(0, -1);
            add(opts);
        });
}


/**
 * Add server to application.
 *
 * @param {Object} opts options for `add` operation
 */
function add(opts: any) {
    let id = 'pinus_add_' + Date.now();
    connectToMaster(id, opts, function (client) {
        client.request(co.moduleId, { signal: 'add', args: opts.args }, function (err: Error) {
            if (err) {
                console.error(err);
            }
            else {
                console.info(ADD_SERVER_INFO);
            }
            process.exit(0);
        });
    });
}
