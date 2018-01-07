import {Agent } from './agent/agent';
import {Server}  from './master/server';
import {HTTP_SERVER} from './console/http';
import * as util  from './common/util';

export interface RobotCfg
{
  clients: Array<any>,
  mainFile: string,
  master: { [key: string]: any },
  apps: Array<any>,
  scriptFile: string
}
/**
 * export to developer prototype
 * 
 * @param {Object} config
 * include deal with master and agent mode
 * 
 * param include mode
 *
 */
export class Robot
{
  conf: RobotCfg;
  master: Server = null;
  agent: Agent = null;

  constructor(conf: RobotCfg)
  {
    this.conf = conf;
  }

  /*
 * run master server
 *
 * @param {String} start up file
 *
 */
  runMaster(mainFile: string)
  {
    let conf: any = {}, master;
    conf.clients = this.conf.clients;
    conf.mainFile = mainFile;
    this.master = new Server(conf);
    this.master.listen(this.conf.master.port);
    HTTP_SERVER.start(this.conf.master.webport);
  };

  /**
   * run agent client 
   *
   * @param {String} script
   *
   */
  runAgent(scriptFile: string)
  {
    let conf: any = {};
    conf.master = this.conf.master;
    conf.apps = this.conf.apps;
    conf.scriptFile = scriptFile;
    this.agent = new Agent(conf);
    this.agent.start();
  };

  restart()
  {
    if (this.agent != null)
    {
      this.agent.reconnect(true);
    }
  }
}

