/*!
 * Pinus -- consoleModule systemInfo
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
import * as monitor from 'pinus-monitor';
import { getLogger } from 'pinus-logger';
import { IModule, ModuleType, MonitorCallback, MasterCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));

let DEFAULT_INTERVAL = 5 * 60;        // in second
let DEFAULT_DELAY = 10;                        // in second


export class SystemInfoModule implements IModule {
    static moduleId = 'systemInfo';

    type: ModuleType;
    interval: number;
    delay: number;
    constructor(opts ?: {type ?: ModuleType , interval?: number; delay ?: number}) {
        opts = opts || {};
        this.type = opts.type || ModuleType.pull;
        this.interval = opts.interval || DEFAULT_INTERVAL;
        this.delay = opts.delay || DEFAULT_DELAY;
    }

    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        // collect data
        monitor.sysmonitor.getSysInfo(function (err: Error, data: any) {
            agent.notify(SystemInfoModule.moduleId, { serverId: agent.id, body: data });
        });
    }

    masterHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        if (!msg) {
            agent.notifyAll(SystemInfoModule.moduleId);
            return;
        }

        let body = msg.body;

        let oneData = {
            Time: body.iostat.date, hostname: body.hostname, serverId: msg.serverId, cpu_user: body.iostat.cpu.cpu_user,
            cpu_nice: body.iostat.cpu.cpu_nice, cpu_system: body.iostat.cpu.cpu_system, cpu_iowait: body.iostat.cpu.cpu_iowait,
            cpu_steal: body.iostat.cpu.cpu_steal, cpu_idle: body.iostat.cpu.cpu_idle, tps: body.iostat.disk.tps,
            kb_read: body.iostat.disk.kb_read, kb_wrtn: body.iostat.disk.kb_wrtn, kb_read_per: body.iostat.disk.kb_read_per,
            kb_wrtn_per: body.iostat.disk.kb_wrtn_per, totalmem: body.totalmem, freemem: body.freemem, 'free/total': (body.freemem / body.totalmem),
            m_1: body.loadavg[0], m_5: body.loadavg[1], m_15: body.loadavg[2]
        };

        let data = agent.get(SystemInfoModule.moduleId);
        if (!data) {
            data = {};
            agent.set(SystemInfoModule.moduleId, data);
        }

        data[msg.serverId] = oneData;
    }

    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        cb(null, agent.get(SystemInfoModule.moduleId) || {});
    }
}