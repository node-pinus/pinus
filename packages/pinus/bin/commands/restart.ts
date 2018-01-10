



import * as program from 'commander';
import { connectToMaster } from '../utils/utils';
import { ConsoleModule as co } from '../../lib/modules/console';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, ADD_SERVER_INFO, RESTART_SERVER_INFO } from '../utils/constants';

export default function (program: program.CommanderStatic) {
    program.command('restart')
    .description('restart the servers, for multiple servers, use `pinus restart server-id-1 server-id-2`')
    .option('-u, --username <username>', 'administration user name', DEFAULT_USERNAME)
    .option('-p, --password <password>', 'administration password', DEFAULT_PWD)
    .option('-h, --host <master-host>', 'master server host', DEFAULT_MASTER_HOST)
    .option('-P, --port <master-port>', 'master server port', DEFAULT_MASTER_PORT)
    .option('-t, --type <server-type>,', 'start server type')
    .option('-i, --id <server-id>', 'start server id')
    .action(function (opts) {
        restart(opts);
    });
}


function restart(opts: any) {
    let id = 'pinus_restart_' + Date.now();
    let serverIds: string[] = [];
    let type: string = null;
    if (!!opts.id) {
        serverIds.push(opts.id);
    }
    if (!!opts.type) {
        type = opts.type;
    }
    connectToMaster(id, opts, function (client) {
        client.request(co.moduleId, { signal: 'restart', ids: serverIds, type: type }, function (err: Error, fails: string[]) {
            if (!!err) {
                console.error(err);
            } else if (!!fails.length) {
                console.info('restart fails server ids: %j', fails);
            } else {
                console.info(RESTART_SERVER_INFO);
            }
            process.exit(0);
        });
    });
}