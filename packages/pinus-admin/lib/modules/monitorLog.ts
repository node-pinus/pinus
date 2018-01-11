/*!
 * Pinus -- consoleModule monitorLog
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
import { getLogger } from 'pinus-logger';
import { exec } from 'child_process';
import * as path from 'path';
import { IModule, MonitorCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';
import { MasterCallback } from '../../index';
let logger = getLogger('pinus-admin', path.basename(__filename));
const readLastLines = require('read-last-lines');
let DEFAULT_INTERVAL = 5 * 60;        // in second


/**
 * Initialize a new 'Module' with the given 'opts'
 *
 * @class Module
 * @constructor
 * @param {object} opts
 * @api public
 */
export class MonitorLogModule implements IModule {
    root: string;
    interval: number;

    static moduleId = 'monitorLog';

    constructor(opts?: { path?: string, interval?: number }) {
        opts = opts || {};
        this.root = opts.path;
        this.interval = opts.interval || DEFAULT_INTERVAL;
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
        if (!msg.logfile) {
            cb(new Error('logfile should not be empty'));
            return;
        }

        let serverId = agent.id;
        fetchLogs(this.root, msg, function (data) {
            cb(null, { serverId: serverId, body: data });
        });
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
        agent.request(msg.serverId, MonitorLogModule.moduleId, msg, function (err, res) {
            if (err) {
                logger.error('fail to run log for ' + err.stack);
                return;
            }
            cb(null, res);
        });
    }
}

// get the latest logs
let fetchLogs = function (root: string, msg: any, callback: (data: { logfile: string, dataArray: any }) => void) {
    let num = msg.number;
    let logfile = msg.logfile;
    let serverId = msg.serverId;
    let filePath = path.join(root, getLogFileName(logfile, serverId));

    let endLogs: any[] = [];

    readLastLines.read(filePath, num)
        .then((output: string) => {
            let endOut = [];
            let outputS = output.replace(/^\s+|\s+$/g, '').split(/\s+/);

            for (let i = 5; i < outputS.length; i += 6) {
                endOut.push(outputS[i]);
            }

            let endLength = endOut.length;
            for (let j = 0; j < endLength; j++) {
                let json;
                try {
                    json = JSON.parse(endOut[j]);
                } catch (e) {
                    logger.error('the log cannot parsed to json, ' + e);
                    continue;
                }
                endLogs.push({
                    time: json.time,
                    route: json.route || json.service,
                    serverId: serverId,
                    timeUsed: json.timeUsed,
                    params: endOut[j]
                });
            }

            callback({ logfile: logfile, dataArray: endLogs });
        });
};

let getLogFileName = function (logfile: string, serverId: string) {
    return logfile + '-' + serverId + '.log';
};