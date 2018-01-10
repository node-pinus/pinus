import { RobotPlugin } from './robotPlugin';
import { RobotCfg } from 'pinus-robot';
import * as fs from 'fs';
export {PinusWSClient, PinusWSClientEvent} from './PinusWSClient';

export function createRobotPlugin(robotScriptFile: string): RobotPlugin;
export function createRobotPlugin(robotScriptFile: RobotCfg): RobotPlugin;
export function createRobotPlugin(conf: RobotCfg | string) {
    let config: RobotCfg;
    if(typeof conf === 'string') {
        config = {scriptFile: conf};
    }
    else {
        config = conf as RobotCfg;
    }
    config.clients = config.clients ? config.clients : ['127.0.0.1'];
    config.master = config.master ? config.master :  {host: '127.0.0.1', port: 8777, interval: 500, webport: 8776};
    if(!fs.existsSync(config.scriptFile)) {
        throw new Error(`RobotPlugin必须指定scriptFile参数`);
    }
    return new RobotPlugin(config);
}