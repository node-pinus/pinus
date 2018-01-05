import { consts } from './consts';
import * as util from './util';
import * as cliff from 'cliff';
import * as fs from 'fs';
import { isFunction } from 'util';
import { AdminClient } from 'pinus-admin';
import { ReadLine } from 'readline';

export interface ICommand
{
	handle(agent: AgentCommand, comd: string, argv: string, msg: {[key:string]: string}, rl: ReadLine, client: AdminClient): void;
}

export class AgentCommand
{
	commands: {[key:string]:any} = {};
	Context = 'all';

	constructor()
	{
		this.init();
	}
	init()
	{
		let self:AgentCommand = this;
		fs.readdirSync(__dirname + '/commands').forEach(function (filename)
		{
			if (/\.js$/.test(filename))
			{
				let name = filename.substr(0, filename.lastIndexOf('.'));
				let _command = require('./commands/' + name).default;
				if (isFunction(_command))
				{
					self.commands[name] = _command;
				}
			}
		});
	}

	handle(argv: string, msg: any, rl: ReadLine, client: AdminClient): void
	{
		let self = this;
		let argvs = util.argsFilter(argv);
		let comd = argvs[0];
		let comd1 = argvs[1] || "";

		comd1 = comd1.trim();
		let m = this.commands[comd];
		if (m)
		{
			let _command = m();
			_command.handle(self, comd1, argv, rl, client, msg);
		} else
		{
			util.errorHandle(argv, rl);
		}
	}

	quit(rl: ReadLine)
	{
		rl.emit('close');
	}

	kill(rl:ReadLine, client:AdminClient)
	{
		rl.question(consts.KILL_QUESTION_INFO, function (answer)
		{
			if (answer === 'yes')
			{
				client.request(consts.CONSOLE_MODULE, {
					signal: "kill"
				}, function (err: Error, data: any)
					{
						if (err) console.log(err);
						rl.prompt();
					});
			} else
			{
				rl.prompt();
			}
		});
	}

	getContext()
	{
		return this.Context;
	}

	setContext(context: string)
	{
		this.Context = context;
	}
}


export default function ()
{
	return new AgentCommand();
}