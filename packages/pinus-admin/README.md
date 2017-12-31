[![Build Status](https://travis-ci.org/node-pinus/pinus-admin.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-admin)

#pomelo-admin

`pomelo-admin` is an admin console library for [pomelo](https://github.com/NetEase/pomelo). It provides the a series of utilities to monitor the `pomelo` server clusters.

##Installation

```
npm install pomelo-admin
```

##Basic conception

###Process roles

There are three process roles in `pomelo-admin`: master, monitor and client.

+ master - the master server process, collects and maintains all the client and monitor status and exports the cluster status for the clients.  

+ monitor - monitor proxy, in every server process which needs to be monitored. It should be started during the process starts and registers itself to the master server and reports the monitored process status to the master. 

+ client - `pomelo-admin` client process that fetches the status from master server, such as [pomelo-admin-web](https://github.com/NetEase/pomelo-admin-web) and [pomelo-cli](https://github.com/NetEase/pomelo-cli).

###Message types

There are two message types of the communication between processes.

+ request - bidirectional message that cooperated with response.

+ notify - unidirectional message.

##Components

###ConsoleService 

Main service of `pomelo-admin` that runs in both master and monitor processes. It maintains the master agent or monitor agent for the process, loads the registed modules and provides the messages routing service for the messages from other processes.

###MasterAgent  

`pomelo-admin` agent that runs on the master process to provide the basic network communication and protocol encoding and decoding.

###MonitorAgent  

`pomelo-admin` agent that runs on the monitor process to provide the basic network communication and protocol encoding and decoding. 

###Module  
 
Module is the place to implement the monitor logic, such as process status collecting. Developer can register modules in `pomelo-admin` to customize all kinds of system monitors.

There are three optional callback functions in each module.

* function masterHandler(agent, msg, cb) - callback in master process to process a message from monitor process or a timer event in master process.

* function monitorHandler(agent, msg, cb) - callback in monitor process to process a message from master process or a timer event in monitor process.

* function clientHandler(agent, msg, cb) - callback in master process to process a message from client.

The relations of the components is as below:

<center>
![pomelo-admin-arch](http://pomelo.netease.com/resource/documentImage/pomelo-admin-arch.png)
</center>

##Usage

```javascript
var admin = require("pomelo-admin");
```

Create a consoleService instance in master process.

```javascript
var masterConsole = admin.createMasterConsole({  
    port: masterPort  
});  
```

Register an admin module.

```javascript
masterConsole.register(moduleId, module);  
```

Start masterConsole.

```javascript
masterConsole.start(function(err) {  
  // start servers  
});  
```

Create a consoleService instance in monitor process. 

```javascript
var monitorConsole = admin.createMonitorConsole({  
    id: serverId,  
    type: serverType,  
    host: masterInfo.host,  
    port: masterInfo.port,  
    info: serverInfo  
}); 
```

##Customized modules  

Developers can customize modules to collect and export additional status as they need.

###Simple example  

```javascript
var Module = function(app, opts) {
  opts = opts || {};
  this.type = opts.type || 'pull';  // pull or push 
  this.interval = opts.interval || 5; // pull or push interval
};

Module.moduleId = 'helloPomelo';

module.exports = Module;

Module.prototype.monitorHandler = function(agent, msg) {
  var word = agent.id + ' hello pomelo';
  // notify admin messages to master
  agent.notify(Module.moduleId, {serverId: agent.id, body: word});
};

Module.prototype.masterHandler = function(agent, msg) {
  // if no message, then notify all monitors to fetch datas
  if(!msg) {
    agent.notifyAll(Module.moduleId);
    return;
  }
  // collect data from monitor
  var data = agent.get(Module.moduleId);
  if(!data) {
    data = {};
    agent.set(Module.moduleId, data);
  }

  data[msg.serverId] = msg;
};

Module.prototype.clientHandler = function(agent, msg, cb) {
  // deal with client request,directly return data cached in master
  cb(null, agent.get(Module.moduleId) || {});
};
```

###Register customized modules

you must register your customized modules to pomelo to make it work.  
write in app.js which is in your project's root directory  

```javascript
app.configure('production|development', function() {
  app.registerAdmin('helloPomelo',new helloPomelo());
});
```

##User level control  
pomelo-admin defines user level for admin client to login master server in this schema  
```javascript
{
    "id": "user-1",
    "username": "admin",
    "password": "admin",
    "level": 1
}
```

**level** defines the user admin level  
level 1 means the user has the admin permission, this user can do anything  
other level user will have limited permission  
currently **add**, **stop**, **kill** will require level 1 permission  

**note**: by default you should provide adminUser.json file under the **config** dir  
adminUser.json
```
[{
    "id": "user-1",
    "username": "admin",
    "password": "admin",
    "level": 1
}, {
    "id": "user-2",
    "username": "monitor",
    "password": "monitor",
    "level": 2
},{
    "id": "user-3",
    "username": "test",
    "password": "test",
    "level": 2
}
]
```

##Self-defined auth 
pomelo-admin provides a simple auth function in [pomelo-admin auth](https://github.com/NetEase/pomelo-admin/blob/master/lib/util/utils.js#L78)  
developers can provide self-defined auth in pomelo by  
in master server
```javascript
app.set('adminAuthUser', function(msg, cb){
  if(auth success) {
    cb(user);
  } else {
    cb(null);
  }
})
```

##Server master auth  
server connect to master with authorization  
pomelo-admin provides a simple auth function in [pomelo-admin auth](https://github.com/NetEase/pomelo-admin/blob/master/lib/util/utils.js#L117)  
developers can provide self-defined auth in pomelo by  
in master server
```javascript
app.set('adminAuthServerMaster', function(msg, cb){
  if(auth success) {
    cb('ok');
  } else {
    cb('bad');
  }
})
```

in monitor server
```javascript
app.set('adminAuthServerMonitor', function(msg, cb){
  if(auth success) {
    cb('ok');
  } else {
    cb('bad');
  }
})
```

**note**: by default you should provide adminServer.json file under the **config** dir  
adminServer.json
```
[{
    "type": "connector",
    "token": "agarxhqb98rpajloaxn34ga8xrunpagkjwlaw3ruxnpaagl29w4rxn"
}, {
    "type": "chat",
    "token": "agarxhqb98rpajloaxn34ga8xrunpagkjwlaw3ruxnpaagl29w4rxn"
},{
    "type": "gate",
    "token": "agarxhqb98rpajloaxn34ga8xrunpagkjwlaw3ruxnpaagl29w4rxn"
}
]
```

**type** is the serverType, **token** is a string you can genrate by yourself  
when using in pomelo, you should fill all your servers with type:token  

###Notes  

`pomelo-admin` provides a series of useful system modules by default. But most of them are turned off by default. Add a simple line of code in `app.js` as below to enable them.

```javascript
app.configure('development', function() {
  // enable the system monitor modules
  app.enable('systemMonitor');
});
```
