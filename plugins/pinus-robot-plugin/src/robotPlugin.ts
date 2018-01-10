import { Application , IPlugin} from 'pinus';
import { Robot, RobotCfg } from 'pinus-robot';
import * as  fs from 'fs';
import * as  path from 'path';

/**
 * 实现机器人Master服务器插件
 */
export class RobotPlugin implements IPlugin {
    name = 'RobotPlugin';

    constructor(private conf: RobotCfg) {

    }

    /**
     * 当所有服务器启动完毕后调用
     * @param app
     */
    afterStartAll(app: Application): void {
        let robot = new Robot(this.conf);
        let mode = 'master';
        let scriptFile = path.normalize(this.conf.scriptFile);
        if(path.sep === '\\') {
            scriptFile = scriptFile.replace(/\\/g , '\\\\');
        }
        // 启动机器人总管
        robot.runMaster(`"${__dirname}/robotAgent.js" --host=${this.conf.master.host} --port=${this.conf.master.port} --interval=${this.conf.master.interval} --scriptFile="${scriptFile}"`);
    }
}
