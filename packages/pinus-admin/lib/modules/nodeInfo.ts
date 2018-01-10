/*!
 * Pinus -- consoleModule nodeInfo processInfo
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
import * as monitor from 'pinus-monitor';
import { getLogger } from 'pinus-logger'; import { IModule, ModuleType, MonitorCallback, MasterCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';
import { PsParam } from 'pinus-monitor';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));

let DEFAULT_INTERVAL = 5 * 60;        // in second
let DEFAULT_DELAY = 10;                        // in second

export class NodeInfoModule implements IModule {
    type: ModuleType;
    interval: number;
    delay: number;

    static moduleId = 'nodeInfo';
    constructor(opts ?: {type?: ModuleType , interval?: number, delay?: number}) {
        opts = opts || {};
        this.type = opts.type || ModuleType.pull;
        this.interval = opts.interval || DEFAULT_INTERVAL;
        this.delay = opts.delay || DEFAULT_DELAY;
    }

    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        let serverId = agent.id;
        let pid = process.pid;
        let params: PsParam = {
            serverId: serverId,
            pid: String(pid)
        };
        monitor.psmonitor.getPsInfo(params, function (err: Error, data: any) {
            agent.notify(NodeInfoModule.moduleId, { serverId: agent.id, body: data });
        });

    }

    masterHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        if (!msg) {
            agent.notifyAll(NodeInfoModule.moduleId);
            return;
        }

        let body = msg.body;
        let data = agent.get(NodeInfoModule.moduleId);
        if (!data) {
            data = {};
            agent.set(NodeInfoModule.moduleId, data);
        }

        data[msg.serverId] = body;
    }

    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        cb(null, agent.get(NodeInfoModule.moduleId) || {});
    }
}