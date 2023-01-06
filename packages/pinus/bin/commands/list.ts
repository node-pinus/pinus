import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT } from '../utils/constants';
import { connectToMaster } from '../utils/utils';
import {AdminClient} from 'pinus-admin';
import * as colors from 'colors';
// @ts-ignore
import * as pc from 'pretty-columns';
import { ConsoleModule as co } from '../../lib/modules/console';
import { Command } from 'commander';

export default function (program: Command) {
    program.command('list')
    .description('list the servers')
    .option('-u, --username <username>', 'administration user name', DEFAULT_USERNAME)
    .option('-p, --password <password>', 'administration password', DEFAULT_PWD)
    .option('-h, --host <master-host>', 'master server host', DEFAULT_MASTER_HOST)
    .option('-P, --port <master-port>', 'master server port', (value)=>parseInt(value), DEFAULT_MASTER_PORT)
    .action(function (opts) {
        list(opts);
    });
}
/**
 * List pinus processes.
 *
 * @param {Object} opts options for `list` operation
 */
function list(opts: any) {
    let id = 'pinus_list_' + Date.now();
    connectToMaster(id, opts, function (client: AdminClient) {
        client.request(co.moduleId, { signal: 'list' }, function (err: Error, data: any) {
            if (err) {
                console.error(err);
            }
            let servers: any[] = [];
            for (let key in data.msg) {
                servers.push(data.msg[key]);
            }
            let comparer = function (a: any, b: any) {
                if (a.serverType < b.serverType) {
                    return -1;
                } else if (a.serverType > b.serverType) {
                    return 1;
                } else if (a.serverId < b.serverId) {
                    return -1;
                } else if (a.serverId > b.serverId) {
                    return 1;
                } else {
                    return 0;
                }
            };
            servers.sort(comparer);
            let rows: string[][] = [];
            rows.push([ colors.red('serverId'), colors.blue('serverType'), colors.green('pid'), colors.cyan('rss(M)'), colors.magenta('heapTotal(M)'), colors.white('heapUsed(M)'), colors.yellow('uptime(m)')]);
            servers.forEach(function (server) {
                rows.push([server.serverId, server.serverType, server.pid, server.rss, server.heapTotal, server.heapUsed, server.uptime]);
            });
            pc.output(rows);
            process.exit(0);
        });
    });
}
