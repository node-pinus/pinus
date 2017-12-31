var schedule = require('../lib/schedule');
var cronTrigger = require('../lib/cronTrigger');
var jobMap = [];

var simpleJob = function(data){
    var t = data.id+data.period;
    console.log("run for simple job :" + data.id + " period: " + data.period + " at time " + (new Date()));
}

var cronJob = function(data){
   console.log("run for cronJob :" + data.id  + " at time " + (new Date()));
}

function scheduleSimpleJobTest(count){
  var id = 0;
  for(var i = 0; i < count; i ++){
    var time = Math.ceil(Math.random() * 10 * 1000);
    var period = Math.ceil(Math.random()*60 * 1000 + 100)
    var id = schedule.scheduleJob({start:Date.now()+time,period:period}, simpleJob, {id:id++, period:period});
    jobMap.push(id);
  }
}

function scheduleCronJobTest(count){
  var id = 0;

//  var trigger = cronTrigger.decodeTrigger('* * 2-20 * * *');
  for(var i = 0; i < count; i++){
  var second = Math.floor(Math.random()*10);
    var id = schedule.scheduleJob('0/2,2-10,13-20,40-45,55-56 * * * * *', cronJob, {id:id++});
    jobMap.push(id);
  }
}

function cancleJob(data){
  var jobMap = data.jobMap;
  if(jobMap.length>0){
    var id = jobMap.pop();
    console.log("Cancel job : "  + id + " Last jobs count : " + jobMap.length);
    data.schedule.cancelJob(id);
}else
    console.log("All job has been cancled");
}

function scheduleCancleJobTest(){
  var id = schedule.scheduleJob({start:Date.now(),period:100, count:jobMap.length}, cancleJob, {jobMap:jobMap,schedule:schedule});
}

function test(){
  scheduleSimpleJobTest(5);

  scheduleCronJobTest(5);

//  scheduleCancleJobTest();
}

test();
//schedule.scheduleJob({period:30, count:4}, simpleJob, {name:'simpleJob'});