[![Build Status](https://travis-ci.org/node-pinus/pinus-scheduler.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-scheduler)

# pinus-scheduler
pinus-schedule is a schedule tool for nodejs, it's purpose is to provide a product level schedule module which is high efficient and can support large number job schedule.You can 

As a schedule tool, it support two kinds of trigger: A simple trigger which use a js object and  a Cron time trigger which use a Cron time string.
##Installation
```
npm install pinus-scheduler
```
##Schedule simple Job
Simple job will receive a object as a trigger, which take three attributes, a JS function as object, and an object as the parameters in the job.

###Simple trigge example
``` javascript
//Fire 10000ms after now, and run 10 times with a 1000ms interval.
var trigger1 = {
  start : Date.now() + 10000, //Start time, use the time in date object
  period : 1000,      //Fire interval, the precision is millisecond
  count : 10          //Fire times, in this case the trigger will fire 10 times.   
}

//Fire right now, and run 10 times with 1000ms interval.
var trigger2 = {
  period : 1000,
  count : 10
}

//Fire right now, and run for ever with 1000ms interval.
var trigger3 = {
  period : 1000
}

//Fire 3000ms after right now, run only once.
var trigger4 = {
  start : Date.now() + 3000;
}

//The job will fire right now, run only once.
var trigger5 = {
}

//Illegal! The 'count' attribute cannot used alone without 'period'.  
var trigger6 = {
  count : 10;
}
``` 

###Simple job example
``` javascript
var schedule = require('../lib/schedule');

var simpleJob = function(data){
   console.log("run Job :" + data.name);
}

schedule.scheduleJob({start:Date.now(), period:3000, count: 10}, simpleJob, {name: 'simpleJobExample'});
```
##Schedule cron Job
Cron job is the job that use cron trigger, it is just like the simple job, only use the cron trigger instead of simple trigger.

###Cron job example
``` javascript
var schedule = require('../lib/schedule');

var cronJob = function(data){
   console.log("run Job :" + data.name);
}

schedule.scheduleJob("0 0/15 8 * * *", cronJob, {name:'cronJobExample'});
```
###Cron Trigger syntax
Cron trigger has 7 fiels, the format is very like the cronTab in linux, only add a second field in the head. The fields and the boundary is as follow:
<pre style="bgcolor='#dbdbdb'">
*     *     *     *   *    *        command to be executed
-     -     -     -   -    -
|     |     |     |   |    |
|     |     |     |   |    +----- day of week (0 - 6) (Sunday=0)
|     |     |     |   +------- month (1 - 12)
|     |     |     +--------- day of month (1 - 31)
|     |     +----------- hour (0 - 23)
|     +------------- min (0 - 59)
+------------- second (0 - 59)
</pre>
###Exampe of cron tirggers

"0/2 0 8 * * 6"    Fire at every Satuaday at every even seconds of 08:00
"0 30 10 1 4 *"      Fire at 10:30 on 1st of March  
"15 15 15 10 10 *"   Fire at Octorber 10th, at 15:15:15.

###Special characters
Pinus-schedule allow three kinds of spechial characters, they are '-', '/' and '.'.

-: '-' means range. For example, 1-3 in the second field means the seconds 1, 2 and 3

/: means increasement. For exapmle, 1/20 in the second field means 1, 21 and 41 second, and 1/2 means for every odd seconds as 1, 3, 5 ... ...

,: means additional values. For example, 1, 10, 15 in the second field means 1, 10 and 15 second. You can use '-', and '/' with ',', for example, 11,20-22,0/2 in the second filed means 11, 21 and all the even seconds. 

##Cancel Job 
``` javascript
var schedule = require('../lib/schedule');

var simpleJob = function(){
   console.log("run simple Job ");
}

//Add a simple job and save the id 
var id = schedule.scheduleJob({period: 1000}, simpleJob, {});

/**
 * Do some thing else
 */

//CancelJob
schedule.cancelJob(id);
```
When you cancel a job, it will stop schedule immidiatelly, and delete the job.
