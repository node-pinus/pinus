import * as colors from 'colors';
// @ts-ignore
import * as pc from 'pretty-columns';
import * as async from 'async';
import * as crypto from 'crypto';
import { consts } from './consts';
import { ReadLine } from 'readline';

let serverMap: { [key: string]: any } = {};

export function log(str: string) {
    process.stdout.write(str + '\n');
}

export function help() {
    let HELP_INFO_1 = consts.HELP_INFO_1;
    for (let i = 0; i < HELP_INFO_1.length; i++) {
        log(HELP_INFO_1[i]);
    }

    let COMANDS_ALL = consts.COMANDS_ALL;
    pc.output(COMANDS_ALL);

    let HELP_INFO_2 = consts.HELP_INFO_2;
    for (let i = 0; i < HELP_INFO_2.length; i++) {
        log(HELP_INFO_2[i]);
    }
}

export function errorHandle(comd: string, rl: ReadLine) {
    log('\nunknow command : ' + comd);
    log('type help for help infomation\n');
    rl.prompt();
}

export function argsFilter(argv: string) {
    let lines;
    if (argv.indexOf('\'') > 0) {
        lines = argv.split('\'');
    }
    let getArg = function (argv: string) {
        let argvs = argv.split(' ');
        for (let i = 0; i < argvs.length; i++) {
            if (argvs[i] === ' ' || argvs[i] === '') {
                argvs.splice(i, 1);
            }
        }
        return argvs;
    };
    if (!!lines) {
        let head = getArg(lines[0]);
        for (let i = 1; i < lines.length - 1; i++) {
            head = head.concat(lines[i]);
        }
        let bottom = getArg(lines[lines.length - 1]);
        return head.concat(bottom);
    } else {
        return getArg(argv);
    }
}

export function formatOutput(comd: string, data: { msg: { [key: string]: any } }) {
    if (comd === 'servers') {
        let msg = data.msg;
        let rows = [];
        let header: Array<any> = [];
        let results = [];
        serverMap = {};
        serverMap['all'] = 1;
        header.push(setHeaderColors(['serverId', 'serverType', 'host', 'port', 'pid', 'heapUsed(M)', 'uptime(m)']));
        for (let key in msg) {
            let server = msg[key];
            if (!server['port']) {
                server['port'] = null;
            }
            serverMap[server['serverId']] = 1;
            rows.push([server['serverId'], server['serverType'], server['host'], server['port'], server['pid'], server['heapUsed'], server['uptime']]);
        }
        async.sortBy(rows, function (server, callback) {
            callback(null, server[0]);
        }, function (err, _results) {
                results = header.concat(_results);
                pc.output(results);
                return;
            });
    }

    if (comd === 'connections') {
        let msg = data.msg;
        let rows = [];
        rows.push(setHeaderColors(['serverId', 'totalConnCount', 'loginedCount']));
        let sumConnCount = 0,
            sumloginedCount = 0;
        for (let key in msg) {
            let server = msg[key];
            rows.push([server['serverId'], server['totalConnCount'], server['loginedCount']]);
            sumConnCount += server['totalConnCount'];
            sumloginedCount += server['loginedCount'];
        }
        rows.push(['sum connections', sumConnCount, sumloginedCount]);
        pc.output(rows);
        return;
    }

    if (comd === 'logins') {
        let msg = data.msg;
        let rows = [];
        rows.push(setHeaderColors(['loginTime', 'uid', 'address']));
        for (let key in msg) {
            let server = msg[key];
            let loginedList = server['loginedList'] || [];
            if (loginedList && loginedList.length === 0) {
                log('\nno user logined in this connector\n');
                return;
            }
            log('\nserverId: ' + server['serverId'] + ' totalConnCount: ' + server['totalConnCount'] + ' loginedCount: ' + server['loginedCount']);
            for (let i = 0; i < loginedList.length; i++) {
                rows.push([format_date(new Date(loginedList[i]['loginTime'])), loginedList[i]['uid'], loginedList[i]['address']]);
            }
            pc.output(rows);
            return;
        }
    }

    if (comd === 'modules') {
        let msg = data.msg;
        log('\n' + consts.MODULE_INFO);
        log(data.msg + '\n');
        return;
    }

    if (comd === 'status') {
        let msg = data.msg;
        let server = msg.body;
        let rows = [];
        rows.push(setHeaderColors(['time', 'serverId', 'serverType', 'pid', 'cpuAvg', 'memAvg', 'vsz', 'rss', 'usr', 'sys', 'gue']));
        if (server) {
            rows.push([server['time'], server['serverId'], server['serverType'], server['pid'], server['cpuAvg'], server['memAvg'], server['vsz'], server['rss'], server['usr'], server['sys'], server['gue']]);
            pc.output(rows);
        } else {
            log('\n' + consts.STATUS_ERROR + '\n');
        }
        return;
    }

    if (comd === 'config' || comd === 'components' || comd === 'settings' || comd === 'get' || comd === 'set' || comd === 'exec' || comd === 'run') {
        pc.output(data);
        return;
    }

    if (comd === 'stop') {
        return;
    }

    if (comd === 'add') {
        return;
    }

    if (comd === 'proxy' || comd === 'handler') {
        pc.output(data);
        return;
    }

    if (comd === 'memory' || comd === 'cpu') {
        log(data + '\n');
        return;
    }
}

export function format_date(date: Date, friendly?: boolean) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();

    if (friendly) {
        let now = new Date();
        let mseconds = -(date.getTime() - now.getTime());
        let time_std = [1000, 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
        if (mseconds < time_std[3]) {
            if (mseconds > 0 && mseconds < time_std[1]) {
                return Math.floor(mseconds / time_std[0]).toString() + ' 秒前';
            }
            if (mseconds > time_std[1] && mseconds < time_std[2]) {
                return Math.floor(mseconds / time_std[1]).toString() + ' 分钟前';
            }
            if (mseconds > time_std[2]) {
                return Math.floor(mseconds / time_std[2]).toString() + ' 小时前';
            }
        }
    }

    // month = ((month < 10) ? '0' : '') + month;
    // day = ((day < 10) ? '0' : '') + day;

    let hourStr: string = ((hour < 10) ? '0' : '') + hour;
    let minuteStr: string = ((minute < 10) ? '0' : '') + minute;
    let secondStr: string = ((second < 10) ? '0' : '') + second;

    return year + '-' + month + '-' + day + ' ' + hourStr + ':' + minuteStr;
}

export function setHeaderColors(header: string[]) {
    return header.map(str => {
        return colors.blue(str);
    });
}

export function getColor(len: number) {
    let color = [];
    for (let i = 0; i < len; i++) {
        color.push('blue');
    }
    return color;
}

export function md5(str: string) {
    let md5sum = crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
}

export function tabComplete(hits: Array<any>, line: string, map: object, comd: string) {
    if (hits.length) {
        return hits;
    }

    if (comd === 'enable' || comd === 'disable') {
        map = {
            'app': 1,
            'module': 1
        };
    }

    if (comd === 'dump') {
        map = {
            'memory': 1,
            'cpu': 1
        };
    }

    if (comd === 'use' || comd === 'stop') {
        map = serverMap;
    }

    // let _hits = [];
    for (let k in map) {
        let t = k;
        if (comd !== 'complete') {
            t = comd + ' ' + k;
        }
        if (t.indexOf(line) === 0) {
            hits.push(t);
        }
    }

    hits.sort();
    return hits;
}