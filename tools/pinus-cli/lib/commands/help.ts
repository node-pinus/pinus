import { getLogger } from 'pinus-logger';
import * as path from 'path';
let logger = getLogger('pinus-cli', path.basename(__filename));
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

export let commandId = 'help';

export class Command implements ICommand
{
	constructor(opts:object)
	{

	}
	handle(agent: AgentCommand, comd: string, argv: string, msg: {[key:string]: string}, rl: ReadLine, client: AdminClient): void
	{
		if (!comd)
		{
			util.errorHandle(argv, rl);
			return;
		}

		let argvs = util.argsFilter(argv);

		if (argvs.length > 2)
		{
			util.errorHandle(argv, rl);
			return;
		}

		if (comd === 'help')
		{
			help();
			rl.prompt();
			return;
		}

		if (consts.COMANDS_MAP[comd as keyof typeof consts.COMANDS_MAP])
		{
			let INFOS = <Array<any>>consts.COMANDS_MAP[comd as keyof typeof consts.COMANDS_MAP];
			for (let i = 0; i < INFOS.length; i++)
			{
				util.log(INFOS[i]);
			}
			rl.prompt();
			return;
		}

		util.errorHandle(argv, rl);
	}
}
let help = function ()
{
	let HELP_INFO_1 = consts.HELP_INFO_1;
	for (let i = 0; i < HELP_INFO_1.length; i++)
	{
		util.log(HELP_INFO_1[i]);
	}

	let COMANDS_ALL = consts.COMANDS_ALL;
	util.log(cliff.stringifyRows(COMANDS_ALL));

	let HELP_INFO_2 = consts.HELP_INFO_2;
	for (let i = 0; i < HELP_INFO_2.length; i++)
	{
		util.log(HELP_INFO_2[i]);
	}
}