import { getLogger } from 'pinus-logger';
import * as utils from '../util/utils';

import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));

let profiler: any = null;
try {
    profiler = require('v8-profiler');
} catch (e) {
}

import * as fs from 'fs';
import { ProfileProxy } from '../util/profileProxy';
import { IModule, MonitorCallback, MasterCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';


export let moduleError: number;

if (!profiler) {
    moduleError = 1;
}

export class ProfilerModule implements IModule {
    static  moduleId = 'profiler';
    proxy: ProfileProxy;
    constructor(opts ?: {isMaster ?: boolean}) {
        if (opts && opts.isMaster) {
            this.proxy = new ProfileProxy();
        }
    }

    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        let type = msg.type, action = msg.action, uid = msg.uid, result = null;
        if (type === 'CPU') {
            if (action === 'start') {
                profiler.startProfiling();
            } else {
                result = profiler.stopProfiling();
                let res: any = {};
                res.head = result.getTopDownRoot();
                res.bottomUpHead = result.getBottomUpRoot();
                res.msg = msg;
                agent.notify(ProfilerModule.moduleId, { clientId: msg.clientId, type: type, body: res });
            }
        } else {
            let snapshot = profiler.takeSnapshot();
            let appBase = process.cwd();
            let name = appBase + '/logs/' + utils.format(new Date()) + '.log';
            let log = fs.createWriteStream(name, { 'flags': 'a' });
            let data;
            snapshot.serialize({
                onData: function (chunk: string, size: number) {
                    chunk = chunk + '';
                    data = {
                        method: 'Profiler.addHeapSnapshotChunk',
                        params: {
                            uid: uid,
                            chunk: chunk
                        }
                    };
                    log.write(chunk);
                    agent.notify(ProfilerModule.moduleId, { clientId: msg.clientId, type: type, body: data });
                },
                onEnd: function () {
                    agent.notify(ProfilerModule.moduleId, { clientId: msg.clientId, type: type, body: { params: { uid: uid } } });
                    profiler.deleteAllSnapshots();
                }
            });
        }
    }

    masterHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        if (msg.type === 'CPU') {
            this.proxy.stopCallBack(msg.body, msg.clientId, agent);
        } else {
            this.proxy.takeSnapCallBack(msg.body);
        }
    }

    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        if (msg.action === 'list') {
            list(agent, msg, cb);
            return;
        }

        if (typeof msg === 'string') {
            msg = JSON.parse(msg);
        }
        let id = msg.id;
        let command = msg.method.split('.');
        let method = command[1] as keyof ProfileProxy;
        let params = msg.params;
        let clientId = msg.clientId;

        if (!this.proxy[method] || typeof this.proxy[method] !== 'function') {
            return;
        }

        this.proxy[method](id, params, clientId, agent);
    }
}

let list = function (agent: MasterAgent, msg: any, cb: MasterCallback) {
    let servers = [];
    let idMap = agent.idMap;

    for (let sid in idMap) {
        servers.push(sid);
    }
    cb(null, servers);
};
