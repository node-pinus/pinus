import { getLogger } from 'pinus-logger';
let logger = getLogger(__filename);
import * as util from '../util';
import { consts } from '../consts';
require('cliff')
import { ICommand, AgentCommand } from '../command';
import { ReadLine } from 'readline';
import { AdminClient } from 'pinus-admin';

export default function (opts:object)
{
	return new Command(opts);
};

export let commandId = 'show';
export let helpCommand = 'help show';

export class Command implements ICommand
{
	constructor(opts:object)
	{

	}
	handle(agent: AgentCommand, comd: string, argv: string, msg: {[key:string]: string}, rl: ReadLine, client: AdminClient): void
	{
		if (!comd)
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		let Context = agent.getContext();
		let argvs = util.argsFilter(argv);
		let param = "";

		if (argvs.length > 2 && comd !== 'config')
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		if (argvs.length > 3 && comd === 'config')
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		if (argvs.length === 3 && comd === 'config')
		{
			param = argvs[2];
		}

		let user = msg['user'] || 'admin';

		if (Context === 'all' && consts.CONTEXT_COMMAND[comd as keyof typeof consts.CONTEXT_COMMAND])
		{
			util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
			rl.prompt();
			return;
		}

		if (!consts.SHOW_COMMAND[comd as keyof typeof consts.SHOW_COMMAND])
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		client.request('watchServer', {
			comd: comd,
			param: param,
			context: Context
		}, function (err:Error, data:{ msg: { [key: string]: any }})
		{
			if (err) console.log(err);
			else util.formatOutput(comd, data);
			rl.prompt();
		});
	}
}