/**
 *
 * agent monitor data map
 *
 * every agent put start and end time in to route map
 * then report to master
 *
 */
import * as fs from 'fs';
let util = require('../common/util');

let dataMap: { [key: string]: any } = {};
let incrMap: { [key: string]: any } = {};
let profData: { [key: string]: any } = {};

export function getData() {
  return {
    timeData: profData,
    incrData: incrMap
  };
}

export function clear() {
  profData = {};
  incrMap = {};
}

export function incr(name: string) {
  incrMap[name] = incrMap[name] == null ? 1 : incrMap[name] + 1;
  console.log(incrMap[name] + ' ' + name);
}

export function decr(name: string) {
  incrMap[name] = incrMap[name] == null ? 0 : incrMap[name] - 1;
}

export function beginTime(route: string, uid: number, id: number) {
  let time = Date.now();
  if (!dataMap[route]) {
    dataMap[route] = buildMapData();
  }
  if (!dataMap[route][uid]) {
    dataMap[route][uid] = buildMapData();
    dataMap[route][uid][id] = time;
  }
  dataMap[route][uid][id] = time;
}

export function endTime(route: string, uid: number, id: number) {
  if (!dataMap[route]) {
    return;
  }
  if (!dataMap[route][uid]) {
    return;
  }
  if (!dataMap[route][uid][id]) {
    return;
  }
  let beginTime = dataMap[route][uid][id];
  delete dataMap[route][uid][id];
  let span = Date.now() - beginTime;
  // console.log('route span ' + route+ ' ' + uid + ' ' +  span);
  // saveTimes(uid,route+":"+span+'\r\n');
  let srcData = profData[route];
  if (!srcData) {
    srcData = { min: span, max: span, avg: span, num: 1 };
    profData[route] = srcData;
  } else {
    if (span < srcData.min) {
      srcData.min = span;
    }
    if (span > srcData.max) {
      srcData.max = span;
    }
    srcData.avg = (srcData.avg * srcData.num + span) / (srcData.num + 1);
    srcData.num = (srcData.num + 1);
  }
}

function buildMapData() {
  let data = {};
  return data;
}

let saveTimes = function (uid: string, value: string) {
  fs.appendFile(util.getPath() + '/detail', value, function (err) {
    if (err) {
      console.log(err);
    }
  });
};

