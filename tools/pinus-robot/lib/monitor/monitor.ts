/**
 *
 * agent monitor data map
 *
 * every agent put start and end time in to route map
 * then report to master 
 *
 */
var fs = require('fs');
var util = require('../common/util');

var monitor = module.exports;
var dataMap = {};
var incrMap = {};
var profData = {};

monitor.getData = function(){
  return {
    timeData:profData,
    incrData:incrMap
  };
};

monitor.clear = function(){
	profData = {};
  incrMap = {};
};

monitor.incr = function(name){
  incrMap[name] = incrMap[name]==null?1:incrMap[name]+1;
  console.log(incrMap[name] + ' ' + name);
}

monitor.decr = function(name){
  incrMap[name] = incrMap[name]==null?0:incrMap[name]-1;
}

monitor.beginTime = function(route,uid,id){
  var time = Date.now();
  if(!dataMap[route]) {
    dataMap[route] = buildMapData();
  }
  if(!dataMap[route][uid]){
    dataMap[route][uid] = buildMapData();
    dataMap[route][uid][id] = time;
  } 
  dataMap[route][uid][id] = time;
}; 

monitor.endTime = function(route,uid,id){
	if(!dataMap[route]){
		return;
	}
  if(!dataMap[route][uid]){
		return;
	}
  if(!dataMap[route][uid][id]){
		return;
	}
  var beginTime = dataMap[route][uid][id];
	delete dataMap[route][uid][id];
  var span = Date.now()-beginTime;
  //console.log('route span ' + route+ ' ' + uid + ' ' +  span);
  //saveTimes(uid,route+":"+span+'\r\n');
  var srcData = profData[route];
  if (!srcData) {
    srcData = {min:span,max:span,avg:span,num:1};
    profData[route] = srcData;
  } else {
    if (span<srcData.min){
      srcData.min = span;
    }
    if (span>srcData.max){
      srcData.max = span;
    }
    srcData.avg = (srcData.avg*srcData.num+span)/(srcData.num+1);
    srcData.num = (srcData.num+1);
  }
};

function buildMapData(){
  var data = {};
  return data;
}

var saveTimes = function(uid,value) {
  fs.appendFile(util.getPath()+'/detail', value, function(err) {
    if(err) {
      console.log(err);
    }
  })
}

