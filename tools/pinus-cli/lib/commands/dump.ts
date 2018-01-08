import { getLogger } from 'pinus-logger';
import * as path from 'path';
let logger = getLogger('pinus-cli', path.basename(__filename));
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

export let commandId = 'dump';
export let helpCommand = 'help dump';


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

		if (argvs.length < 3 || (comd === 'cpu' && argvs.length < 4))
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		let param = {};

		if (comd === 'memory')
		{
			param = {
				filepath: argvs[2],
				force: (argvs[3] === '--force' ? true : false)
			}
		} else if (comd === 'cpu')
		{
			param = {
				filepath: argvs[2],
				times: argvs[3],
				force: (argvs[4] === '--force' ? true : false)
			}
		}

		client.request('watchServer', {
			comd: comd,
			param: param,
			context: Context
		}, function (err: Error, data:{ msg: { [key: string]: any } })
			{
				if (err) console.log(err);
				else util.formatOutput(comd, data);
				rl.prompt();
			});
	}
}