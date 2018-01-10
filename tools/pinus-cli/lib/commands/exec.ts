import { getLogger } from 'pinus-logger';
import * as path from 'path';
let logger = getLogger('pinus-cli', path.basename(__filename));
import * as util from '../util';
import { consts } from '../consts';
require('cliff');
import * as fs from 'fs';
import { ICommand, AgentCommand } from '../command';
import { ReadLine } from 'readline';
import { AdminClient } from 'pinus-admin';

export default function (opts: object) {
    return new Command(opts);
}

export let commandId = 'exec';
export let helpCommand = 'help exec';

export class Command implements ICommand {
    constructor(opts: object) {

    }
    handle(agent: AgentCommand, comd: string, argv: string, msg: {[key: string]: string}, rl: ReadLine, client: AdminClient): void {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let Context = agent.getContext();
        if (Context === 'all') {
            util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
            rl.prompt();
            return;
        }

        let argvs = util.argsFilter(argv);

        if (argvs.length > 2) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let file = null;
        if (comd[0] !== '/') {
            comd = process.cwd() + '/' + comd;
        }

        try {
            file = fs.readFileSync(comd).toString();
        } catch (e) {
            util.log(consts.COMANDS_EXEC_ERROR);
            rl.prompt();
            return;
        }

        client.request('scripts', {
            command: 'run',
            serverId: Context,
            script: file
        }, function (err: Error, msg: any) {
                if (err) console.log(err);
                else {
                    try {
                        msg = <{ msg: { [key: string]: any }}>JSON.parse(msg);
                        util.formatOutput(commandId, msg);
                    } catch (e) {
                        util.log('\n' + msg + '\n');
                    }
                }
                rl.prompt();
            });
    }

}