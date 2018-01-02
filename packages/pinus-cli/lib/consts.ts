export let consts = {
	CONSOLE_MODULE: "__console__",

	PROMPT: "@pinus : ",

	WELCOME_INFO: ["\nWelcome to Pinus interactive client.",
		"Pinus is a fast, scalable game server framework for node.js. ",
		"Type \'help\' for more information.\n"
	],

	HELP_INFO_1: [
		"\nFor information about Pinus products and services, visit:",
		"   https://pinus.io/",
		"\nList of all Pinus commands:\n"
	],

	HELP_INFO_2: [
		"\nFor more command usage, type : help command",
		"example: help show\n"
	],

	HELP_LOGIN: [
		"\nWelcome to Pinus interactive client.",
		"Pinus is a fast, scalable game server framework for node.js. ",
		"You can use following command to connect to pinus master",
		"pinus-cli -h host -P port -u user -p password",
		"Default type pinus-cli equals to:",
		"pinus-cli -h 127.0.0.1 -P 3005 -u admin -p admin\n"
	],

	COMANDS_ALL: [
		["command", "  description"],
		["?", "  symbol for help"],
		["help", "  display the help"],
		["quit", "  quit pinus-cli"],
		["kill", "  kill all servers"],
		["exec", "  exec script files"],
		["get", "  equal to app.get(key) "],
		["set", "  equal to app.set(key, value)"],
		["add", "  add server to pinus clusters"],
		["stop", "  stop server. Takes serverId as argument"],
		["show", "  show infos like : user, servers, connections"],
		["use", "  use another server. Takes serverId as argument"],
		["enable", "  enable an admin console module or enable app settings"],
		["disable", "  disable an admin console module or disable app settings"],
		["dump", "  make a dump of the V8 heap and cpu for later inspection"],
		["addCron", "  add cron for server"],
		["removeCron", "  remove cron for server"],
		["blacklist", " add blacklist for frontend server"],
		["run", " run script in server"]
	],

	COMANDS_MAP: {
		"help": 1,
		"add": ["\nadd server to pinus clusters",
			"add args are key=value from servers.json config files",
			"example: add host=127.0.0.1 port=3451 serverType=chat id=chat-server-2",
			"example: add host=127.0.0.1 port=3152 serverType=connector id=connector-server-3 clientPort=3012 frontend=true\n",
		],
		"show": ["\nshow infos like : servers, connections",
			"you can show following informations:",
			"servers, connections, logins, modules, status, proxy, handler, components, settings",
			"example: show servers",
			"example: show connections",
			"example: show proxy",
			"example: show handler",
			"example: show logins\n"
		],
		"config": ["\nconfig infos like : proxy, remote, connection, connector, session",
			"you can show following informations:",
			"proxy, remote, connection, connector, session, protobuf",
			"localSession, channel, server, scheduler, globalChannel, monitor",
			"example: show config proxy",
			"example: show config remote",
			"example: show config connection",
			"note: show config xxx command show configuration from app.get(\'xxxConfig\')",
			"in pinus you can pass opt config to component to make your like-style server",
			"but you should keep in mind to use it in a proper context\n"
		],
		"use": ["\nuse another server. takes serverId|all as argument",
			"use <serverId>|all",
			"then you will switch to serverId|all context",
			"your command will be applied to serverId|all server",
			"example: use area-server-1",
			"example: use all\n"
		],
		"enable": ["\nenable an admin console module or enable app settings",
			"enable module <moduleId>",
			"enable app <settings>",
			"example: enable module systemInfo",
			"example: enable app systemMonitor\n",
		],
		"disable": ["\ndisable an admin console module or disable app settings",
			"disable module <moduleId>",
			"disable app <settings>",
			"example: disable module systemInfo",
			"example: disable app systemMonitor\n"
		],
		"stop": ["\nstop server. takes serverId as argument.",
			"stop <serverId>",
			"example: stop area-server-1\n"
		],
		"kill": ["\nkill all servers.",
			"example: kill",
			"note: be carefull to use this command\n"
		],
		"dump": ["\nmake a dump of the V8 heap and cpu for later inspection",
			"dump cpu|memory <filepath> [times] [--force]",
			"times is the number of cpu dump costs in seconds",
			"example: dump cpu /home/xxx/test 5",
			"example: dump memory /home/xxx/test",
			"note: you can add --force to write dump file if file existed",
			"example: dump cpu /home/xxx/test 5 --force",
			"example: dump memory /home/xxx/test --force\n"
		],
		"get": ["\nequal to app.get(key)",
			"example: get <key>\n"
		],
		"set": ["\nequal to app.set(key, value)",
			"example: set <key> <value>",
			"note: value must be string\n"
		],
		"exec": ["\nexec script files",
			"example: exec <filepath>",
			"filepath can be relative path to your pinus-cli pwd path",
			"example : exec xxx.js",
			"equals to : exec pwd/xxx.js",
			"filepath also can be absolute with \'/\' ahead",
			"example : exec /home/user/xxx.js\n"
		],
		"addCron": ["\nadd cron for server",
			"addCron args are key=value from crons.json config files",
			"example: addCron id=8 serverId=chat-server-1 'time=0 30 10 * * *' action=chatCron.send",
			"example: addCron id=8 serverType=chat 'time=0 30 10 * * *' action=chatCron.send\n"
		],
		"removeCron": ["\nremove cron for server",
			"example: removeCron id=8 serverId=chat-server-1",
			"example: removeCron id=8 serverType=chat"
		],
		"blacklist": ["\nadd blacklist for frontend server",
			"example: blacklist 192.168.10.120 192.168.18.60",
			"example: blacklist \b(([01]?\d?\d|2[0-4]\d|25[0-5])\.){3}([01]?\d?\d|2[0-4]\d|25[0-5])\b"
		],
		"run": ["\nrun script in server",
			"example: run app.get(\"sessionService\").getSessionsCount()",
			"example: run app.isMaster()"
		]
	},

	COMANDS_COMPLETE_INFO: {
		"help": 1,
		"add": 1,
		"show": 1,
		"enable": 1,
		"disable": 1,
		"stop": 1,
		"kill": 1,
		"get": 1,
		"set": 1,
		"use": 1,
		"dump": 1,
		"exec": 1,
		"addCron": 1,
		"removeCron": 1,
		"blacklist": 1,
		"run": 1
	},

	SHOW_COMMAND: {
		"servers": 1,
		"connections": 1,
		"logins": 1,
		"modules": 1,
		"status": 1,
		"config": 1,
		"proxy": 1,
		"handler": 1,
		"components": 1,
		"settings": 1
	},

	CONTEXT_COMMAND: {
		"status": 1,
		"logins": 1,
		"proxy": 1,
		"handler": 1,
		"components": 1,
		"settings": 1,
		"enable": 1,
		"disable": 1
	},

	COMPLETE_TWO: {
		"show": 1,
		"help": 1,
		"enable": 1,
		"disable": 1,
		"dump": 1
	},

	// ASCII_LOGO: [
	// 	".______     ______   .___  ___.  _______   __         ______   ",
	// 	"|   _  )   (  __  )  |   \\/   | |   ____| |  |       (  __  )  ",
	// 	"|  |_)  ) |  |  |  | |  \\  /  | |  |__    |  |      |  |  |  | ",
	// 	"|   ___)  |  |  |  | |   \\/   | |   __|   |  |      |  |  |  | ",
	// 	"|  |      |  `--'  | |  |  |  | |  |____  |  `----. |  `--'  | ",
	// 	"| _|       (______)  |__|  |__| |_______| |_______|  (______)  "
	// ],

	ASCII_LOGO: [
		".__________________.",
		"|                  |",
		"|      PINUS       |",
		"|__________________|",
	],

	COMANDS_COMPLETE: ["help", "quit", "kill", "exec", "get", "set",
		"add", "stop", "show", "use", "enable", "disable", "dump", "addCron", "removeCron"],

	COMANDS_ERROR: "this command is error format",
	COMANDS_ADD_ERROR: "\nadd command error\n",
	COMANDS_ENABLE_ERROR: "\nenable command error\n",
	COMANDS_DISABLE_ERROR: "\ndisable command error\n",
	COMANDS_CONFIG_ERROR: "\nconfig command error\n",
	COMANDS_SHOW_ERROR: "\nshow command error\n",
	COMANDS_KILL_ERROR: "\nkill command error\n",
	COMANDS_USE_ERROR: "\nuse command error\n",
	COMANDS_STOP_ERROR: "\nstop command error\n",
	COMANDS_EXEC_ERROR: "\nexec command script filepath error\n",
	COMANDS_CONTEXT_ERROR: "this command is not used in this context\nyou can use command \'use\' to switch context",
	MODULE_INFO: "there are following modules registered in pinus clusters",
	COMPONENTS_INFO: "there are following components registered in current server",
	STATUS_ERROR: "can not get status in this server",
	KILL_QUESTION_INFO: "warning : do you really want to kill all servers [yes/no] ",
	STOP_QUESTION_INFO: "warning : do you really want to stop this server [yes/no] ",
	ADD_QUESTION_INFO: "warning : do you really want to add this server [yes/no] ",
	ADDCRON_QUESTION_INFO: "warning : do you really want to add this cron [yes/no] ",
	BLACKLIST_QUESTION_INFO: "warning : do you really want to add this blacklist [yes/no] ",
}