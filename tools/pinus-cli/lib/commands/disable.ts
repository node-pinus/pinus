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

export let commandId = 'disable';
export let helpCommand = 'help disable';


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
		if (Context === 'all')
		{
			util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
			rl.prompt();
			return;
		}

		let argvs = util.argsFilter(argv);

		if (argvs.length > 3)
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		let param = argvs[2];

		if (comd === 'module')
		{
			client.command(commandId, param, null, function (err: Error, data: number)
			{
				if (err) console.log(err);
				else
				{
					if (data === 1)
					{
						util.log('\ncommand ' + argv + ' ok\n');
					} else
					{
						util.log('\ncommand ' + argv + ' bad\n');
					}
				}
				rl.prompt();
			});
		} else if (comd === 'app')
		{
			client.request('watchServer', {
				comd: commandId,
				param: param,
				context: Context
			}, function (err: Error, data: string)
			{
				if (err) console.log(err);
				else util.log('\n' + data + '\n');
				rl.prompt();
			});
		} else
		{
			agent.handle(helpCommand, msg, rl, client);
		}
	}
}