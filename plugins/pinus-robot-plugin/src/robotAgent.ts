import { Application , IPlugin} from 'pinus';
import { Robot, RobotCfg } from 'pinus-robot';
import * as  fs from 'fs';
import { argv } from 'yargs';

console.log('启动robotAgent');
let args = argv as any;
let config = {
    master: {host: args.host, port: args.port, interval: args.interval}
} as RobotCfg;

let robot = new Robot(config);
robot.runAgent(args.scriptFile as any);

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
    if (!!robot && !!robot.agent) {
    // robot.agent.socket.emit('crash', err.stack);
    }
    fs.appendFile('./log/.log', err.stack, function (err) { });
});
