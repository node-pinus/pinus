/*!
 * Pomelo -- consoleModule onlineUser
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
import { getLogger } from 'pinus-logger';
import * as utils from '../util/utils';
import { IModule, MonitorCallback, MasterCallback, ModuleType ,  MonitorAgent, MasterAgent } from 'pinus-admin';
import { Application } from '../application';
import { pinus } from '../pinus';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


export class OnlineUserModule implements IModule {

    static moduleId = 'onlineUser';

    app: Application;
    type: ModuleType;
    interval: number;

    constructor(opts?: { type?: ModuleType, interval?: number }) {
        opts = opts || {};
        this.app = pinus.app;
        this.type = opts.type || ModuleType.pull;
        this.interval = opts.interval || 5;
    }

    /**
    * collect monitor data from monitor
    *
    * @param {Object} agent monitorAgent object
    * @param {Object} msg client message
    * @param {Function} cb callback function
    * @api public
    */
    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        let connectionService = this.app.components.__connection__;
        if (!connectionService) {
            logger.error('not support connection: %j', agent.id);
            return;
        }
        agent.notify(OnlineUserModule.moduleId, connectionService.getStatisticsInfo());
    }

    masterHandler(agent: MasterAgent, msg: any) {
        if (!msg) {
            // pull interval callback
            let list = agent.typeMap['connector'];
            if (!list || list.length === 0) {
                return;
            }
            agent.notifyByType('connector', OnlineUserModule.moduleId, msg);
            return;
        }

        let data = agent.get(OnlineUserModule.moduleId);
        if (!data) {
            data = {};
            agent.set(OnlineUserModule.moduleId, data);
        }

        data[msg.serverId] = msg;
    }
    /**
     * Handle client request
     *
     * @param {Object} agent masterAgent object
     * @param {Object} msg client message
     * @param {Function} cb callback function
     * @api public
     */
    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        utils.invokeCallback(cb, null, agent.get(OnlineUserModule.moduleId));
    }

}