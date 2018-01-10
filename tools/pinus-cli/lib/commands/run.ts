import { getLogger } from 'pinus-logger';
import * as path from 'path';
let logger = getLogger('pinus-cli', path.basename(__filename));
import * as util from '../util';
import { consts } from '../consts';
require('cliff');
import { ICommand, AgentCommand } from '../command';
import { ReadLine } from 'readline';
import { AdminClient } from 'pinus-admin';

export default function (opts: object) {
    return new Command(opts);
}

export let commandId = 'run';
export let helpCommand = 'help run';


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

        if (argvs.length < 2) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        client.request('watchServer', {
            comd: commandId,
            param: comd,
            context: Context
        }, function (err: Error, data: { msg: { [key: string]: any }}) {
            if (err) console.log(err);
            else util.formatOutput(commandId, data);
            rl.prompt();
        });
    }
}