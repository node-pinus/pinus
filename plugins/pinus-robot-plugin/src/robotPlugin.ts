import { Application , IPlugin} from "pinus";
import { Robot, RobotCfg } from 'pinus-robot';
import * as  fs from 'fs';

/**
 * 实现机器人Master服务器插件
 */
export class robotPlugin implements IPlugin
{
    name = "RobotPlugin";

    constructor(private conf: RobotCfg)
    {

    }
    
    /**
     * 当所有服务器启动完毕后调用
     * @param app 
     */
    afterStartAll(app:Application):void
    {
        var robot = new Robot(this.conf);
        var mode = 'master';
        // 启动机器人总管
        robot.runMaster(`${__dirname}/robotAgent.js --host=${this.conf.master.host} --port=${this.conf.master.port} --interval=${this.conf.master.interval} --scriptFile=${this.conf.scriptFile}`);
    }
}
