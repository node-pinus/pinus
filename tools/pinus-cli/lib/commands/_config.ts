import { getLogger } from 'pinus-logger';
let logger = getLogger(__filename);
import * as util from '../util';
import { consts } from '../consts';
import * as cliff from 'cliff';
import { ICommand, AgentCommand } from '../command';
import { ReadLine } from 'readline';
import { AdminClient } from 'pinus-admin';

export default function (opts:object)
{
	return new Command(opts);
};

export let commandId = 'config';
export let helpCommand = 'help config';

export class Command implements ICommand
{
	constructor(opt:object)
	{

	}

	handle(agent : AgentCommand , comd : string , argv : string, msg : {[key:string]: string}, rl : ReadLine, client : AdminClient):void
	{
		if (!comd)
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}
		let Context = agent.getContext();
		let argvs = util.argsFilter(argv);

		if (argvs.length > 2)
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		let user = msg['user'] || 'admin';

		if (Context === 'all')
		{
			util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
			rl.prompt();
			return;
		}

		client.request('watchServer', {
			comd: commandId,
			param: comd,
			context: Context
		}, function (err: Error, data: object)
			{
				if (err) console.log(err);
				else util.log('\n' + cliff.inspect(data) + '\n');
				rl.prompt();
			});
	}
}