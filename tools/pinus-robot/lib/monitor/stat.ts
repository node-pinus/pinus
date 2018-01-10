import { Stream } from 'stream';

/**
 * stat  receive agent client monitor data
 * merger vaild data that has response
 * when server  restart, it will clear
 *
 *
 */
let _ = require('underscore');
let _timeDataMap: { [key: string]: any } = {};
let _countDataMap: { [key: string]: any } = {};

let incrData: { [key: string]: any } = {};

export function getTimeData() {
    return _timeDataMap;
}

export function getCountData() {
    return _countDataMap;
}

/**
 * clear data
 */
export function clear(agent?: string) {
    if (!!agent) {
        delete _timeDataMap[agent];
        delete _countDataMap[agent];
    } else {
        _timeDataMap = {};
        _countDataMap = {};
    }
}

export function getDetails() {
    return {time: _timeDataMap , count : _countDataMap , incr: incrData};
}

export function merge(agent: string, message: any) {
    _timeDataMap[agent] = message.timeData;
    _countDataMap[agent] = message.incrData;
}
