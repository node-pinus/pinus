#pinus-robot
pinus-robot is a simple tool to benchmark the socket.io server's performance.

pinus-robot can run in multiple mode such as single machine or distributed machines with many processes.

pinus-robot executes developer's custom javascript in a sand box and statistical analysis monitors including avg(min/max) responsing time and QPS, etc. Then reports data to the http server with graph display.

pinus-robot can be also used in http benchmark with developer script.


##Installation
```
npm install pinus-robot
```

##Usage
``` javascript
var envConfig = require('./app/config/env.json');
var config = require('./app/config/' + envConfig.env + '/config');
var Robot = require('pinus-robot').Robot;

var robot = new Robot(config);
var mode = 'master';

if (process.argv.length > 2){
  mode = process.argv[2];
}

if (mode !== 'master' && mode !== 'client') {
  throw new Error(' mode must be master or client');
}

if (mode === 'master') {
  robot.runMaster(__filename);
} else {
  var script = (process.cwd() + envConfig.script);
  robot.runAgent(script);
}
``` 

##API
###robot.runMaster()
run master server and http server, then init server status including clients with startup file. 
####Arguments
+ startupFile - The master server auto startup agent file name, default is current running file;

###robot.runAgent()
robot run in client agent mode.
####Arguments
+ script - The developer's custom script that the agent will execute. 

###Notice
When pinus-robot run in distribute mode, every client should be in same directory path and master could be ssh login automatic. Otherwise developer can start up agent manually. For the custom script, refer to [the demo](https://github.com/NetEase/pinus-robot-demo).

