import * as readline from 'readline';
import { AdminClient } from 'pinus-admin';
import * as command from './command';
import { consts } from './consts';
import * as util from './util';
import { argv } from 'optimist';

let username = argv['u'] = argv['u'] || 'monitor';
let password = argv['p'] = argv['p'] || 'monitor';
let host = argv['h'] = argv['h'] || 'localhost';
let port = argv['P'] = argv['P'] || 3005;
let context = 'all';
let client: AdminClient = null;


export default function doConnect() {
  client = new AdminClient({
    username: username,
    password: password,
    md5: true
  });
  let id = 'pinus_cli_' + Date.now();
  client.connect(id, host, port, function (err: Error) {
    if (err) {
      util.log('\n' + err + '\n');
      process.exit(0);
    } else {
      let ASCII_LOGO = consts.ASCII_LOGO;
      for (let i = 0; i < ASCII_LOGO.length; i++) {
        util.log(ASCII_LOGO[i]);
      }

      let WELCOME_INFO = consts.WELCOME_INFO;
      for (let i = 0, l = WELCOME_INFO.length; i < l; i++) {
        util.log(WELCOME_INFO[i]);
      }
      startCli();
    }
  });
  client.on('close', function () {
    client.socket.disconnect();
    util.log('\ndisconnect from master');
    process.exit(0);
  });
}

function startCli() {
  let rl = readline.createInterface(process.stdin, process.stdout, completer);
  let PROMPT = username + consts.PROMPT + context + '>';
  rl.setPrompt(PROMPT);
  rl.prompt();

  let rootCommand = command.default();

  rl.on('line', function (line) {
    let key = line.trim();
    if (!key) {
      util.help();
      rl.prompt();
      return;
    }
    switch (key) {
      case 'help':
        util.help();
        rl.prompt();
        break;
      case '?':
        util.help();
        rl.prompt();
        break;
      case 'quit':
        rootCommand.quit(rl);
        break;
      case 'kill':
        rootCommand.kill(rl, client);
        break;
      default:
        rootCommand.handle(key, {
          user: username
        }, rl, client);
        break;
    }
  }).on('close', function () {
    util.log('bye ' + username);
    process.exit(0);
  });
}

function completer(line: string) {
  line = line.trim();
  let completions = consts.COMANDS_COMPLETE;
  let hits = [];
  // commands tab for infos
  if (consts.COMPLETE_TWO[line as keyof typeof consts.COMPLETE_TWO]) {
    if (line === 'show') {
      for (let k in consts.SHOW_COMMAND) {
        hits.push(k);
      }
    } else if (line === 'help') {
      for (let k in consts.COMANDS_COMPLETE_INFO) {
        hits.push(k);
      }
    } else if (line === 'enable' || line === 'disable') {
      hits.push('app');
      hits.push('module');
    } else if (line === 'dump') {
      hits.push('memory');
      hits.push('cpu');
    }
  }

  hits = util.tabComplete(hits, line, consts.COMANDS_COMPLETE_INFO, 'complete');
  hits = util.tabComplete(hits, line, consts.COMANDS_COMPLETE_INFO, 'help');
  hits = util.tabComplete(hits, line, consts.SHOW_COMMAND, 'show');
  hits = util.tabComplete(hits, line, null, 'enable');
  hits = util.tabComplete(hits, line, null, 'disable');
  hits = util.tabComplete(hits, line, null, 'disable');
  hits = util.tabComplete(hits, line, null, 'dump');
  hits = util.tabComplete(hits, line, null, 'use');
  hits = util.tabComplete(hits, line, null, 'stop');

  // show all completions if none found
  return [hits.length ? hits : completions, line];
}