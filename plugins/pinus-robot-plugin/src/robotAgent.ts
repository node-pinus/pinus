import { Application , IPlugin} from 'pinus';
import { Robot, RobotCfg } from 'pinus-robot';
import * as  fs from 'fs';
import * as yargs from 'yargs';
let argv = yargs.argv;

console.log('启动robotAgent');

let config = {
    master: {host: argv.host, port: argv.port, interval: argv.interval}
} as RobotCfg;

let robot = new Robot(config);
robot.runAgent(argv.scriptFile);

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
    if (!!robot && !!robot.agent) {
    // robot.agent.socket.emit('crash', err.stack);
    }
    fs.appendFile('./log/.log', err.stack, function (err) { });
});
