/**
 *Module dependencies
 */

import { exec, spawn } from 'child_process';
import * as util from '../utils/util';

export interface PsParam {
    pid: string;
    serverId: string | number;
}

/**
 * get the process information by command 'ps auxw | grep serverId | grep pid'
 *
 * @param {Object} param
 * @param {Function} callback
 * @api public
 */
export function getPsInfo(param: PsParam, callback: Function): void {
    if (process.platform === 'win32') return;
    let pid = param.pid;
    let cmd = 'ps auxw | grep ' + pid + ' | grep -v \'grep\'';
    // let cmd = "ps auxw | grep -E '.+?\\s+" + pid + "\\s+'"  ;
    exec(cmd, function (err: any, output) {
        if (!!err) {
            if (err.code === 1) {
                console.log('the content is null!');
            } else {
                console.error('getPsInfo failed! ' + err.stack);
            }
            callback(err, null);
            return;
        }
        format(param, output, callback);
    });
}

/**
 * convert serverInfo to required format, and the callback will handle the serverInfo
 *
 * @param {Object} param, contains serverId etc
 * @param {String} data, the output if the command 'ps'
 * @param {Function} cb
 * @api private
 */

function format(param: PsParam, data: string, cb: Function) {
    let time = util.formatTime(new Date());
    let outArray = data.toString().replace(/^\s+|\s+$/g, '').split(/\s+/);
    let outValueArray: Array<string> = [];
    for (let i = 0; i < outArray.length; i++) {
        if ((!isNaN(<any>outArray[i]))) {
            outValueArray.push(outArray[i]);
        }
    }
    let ps: any = {};
    ps.time = time;
    ps.serverId = param.serverId;
    ps.serverType = ps.serverId.split('-')[0];
    let pid = ps.pid = param.pid;
    ps.cpuAvg = outValueArray[1];
    ps.memAvg = outValueArray[2];
    ps.vsz = outValueArray[3];
    ps.rss = outValueArray[4];
    outValueArray = [];
    if (process.platform === 'darwin') {
        ps.usr = 0;
        ps.sys = 0;
        ps.gue = 0;
        cb(null, ps);
        return;
    }
    exec('pidstat -p ' + pid, function (err, output) {
        if (!!err) {
            console.error('the command pidstat failed! ', err.stack);
            return;
        }
        let outArray = output.toString().replace(/^\s+|\s+$/g, '').split(/\s+/);

        for (let i = 0; i < outArray.length; i++) {
            if ((!isNaN(outArray[i] as any))) {
                outValueArray.push(outArray[i]);
            }
        }
        ps.usr = outValueArray[1];
        ps.sys = outValueArray[2];
        ps.gue = outValueArray[3];

        cb(null, ps);
    });
}

