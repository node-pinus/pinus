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

export let commandId = 'use';
export let helpCommand = 'help use';

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

		if (argvs.length > 2)
		{
			agent.handle(helpCommand, msg, rl, client);
			return;
		}

		let user = msg['user'] || 'admin';

		if (comd === 'all')
		{
			util.log('\nswitch to server: ' + comd + '\n');
			Context = comd;
			agent.setContext(Context);
			let PROMPT = user + consts.PROMPT + Context + '>';
			rl.setPrompt(PROMPT);
			rl.prompt();
			return;
		}

		client.request('watchServer', {
			comd: 'servers',
			context: Context
		}, function (err:Error, data:{ msg: { [key: string]: any }})
		{
			if (err) console.log(err);
			else
			{
				let _msg = data['msg'];
				if (_msg[comd])
				{
					util.log('\nswitch to server: ' + comd + '\n');
					Context = comd;
					agent.setContext(Context);
					let PROMPT = user + consts.PROMPT + Context + '>';
					rl.setPrompt(PROMPT);
				} else
				{
					util.log('\ncommand \'use ' + comd + '\' error for serverId ' + comd + ' not in pinus clusters\n');
				}
			}
			rl.prompt();
		});
	}
}