# Commands list  

- [use](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#use)  
- [quit](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#quit)  
- [kill](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#kill)  
- [exec](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#exec)  
- [get](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#get)  
- [set](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#set)  
- [add](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#add)  
- [stop](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#stop)  
- [show](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#show)  
- [enable](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#enable)  
- [disable](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#disable)  
- [dump](https://github.com/NetEase/pomelo-cli/wiki/pomelo-cli-man-page#dump)  

# Use
use another server. takes serverId|all as argument  
use {serverId|all}  
then you will switch to serverId|all context  
your command will be applied to serverId|all server  
```
example: use area-server-1  
example: use all  
```
**note**: context is what your command will be applied to  

# Quit
type **quit** and you can quit pomelo-cli  

# Kill
kill all servers   
example: **kill**  
**note**: be carefull to use this command  

# Exec
exec script files  
example: exec {filepath}  
filepath can be relative path to your pomelo-cli pwd path  
```
example : exec xxx.js  
```
equals to : exec pwd/xxx.js  
filepath also can be absolute with '/' ahead  
```
example : exec /home/user/xxx.js  
```
script file is executed through [**vm**](http://nodejs.org/api/vm.html)  
vm context is   
```
var context = {
  app: this.app,
  require: require,
  os: require("os"),
  fs: require("fs"),
  process: process,
  util: util
};
```
execute result is returned through **result** param  
so in script files you should use **result** to get the return value  

getCPUs.js
```
var cpus = os.cpus();
result = util.inspect(cpus,true,null);
```

# Get
equal to app.get(key)  
``` 
example: get {key}  
```

# Set
equal to app.set(key, value)  
```
example: set {key} {value}  
```
**note**: value must be string or simple value   

# Add  
add server to pomelo clusters  
add args are key=value from servers.json config files  
```
example: add host=127.0.0.1 port=3451 serverType=chat id=chat-server-2  
example: add host=127.0.0.1 port=3152 serverType=connector id=connector-server-3 clientPort=3012 frontend=true  
```
**note**: be careful to add server using right full args, otherwise the server will run in bad mode     

# Stop
stop server. takes serverId as argument    
stop {serverId}  
```
example: stop area-server-1  
```

# Show  
show infos like : servers, connections  
you can show following informations:  
servers, connections, logins, modules, status, proxy, handler, components, settings  
```
example: show servers  
example: show connections  
example: show proxy  
example: show handler  
example: show logins  
```

# Enable
enable an admin console module or enable app settings  
enable module {moduleId}  
enable app {settings}  
```
example: enable module systemInfo  
example: enable app systemMonitor  
```

# Disable
disable an admin console module or disable app settings  
disable module {moduleId}  
disable app {settings}  
```
example: disable module systemInfo  
example: disable app systemMonitor  
```

# Dump
make a dump of the V8 heap and cpu for later inspection  
dump cpu|memory {filepath} [times] [--force]  
times is the number of cpu dump costs in seconds  
```
example: dump cpu /home/xxx/test 5  
example: dump memory /home/xxx/test  
```
**note**: you can add --force to write dump file if file existed  
```
example: dump cpu /home/xxx/test 5 --force  
example: dump memory /home/xxx/test --force  
```

# AddCron
add cron for server
add args are key=value from crons.json config files  
```
example: addCron id=8 serverId=chat-server-1 'time=0 30 10 * * *' action=chatCron.send
example: addCron id=8 serverType=chat 'time=0 30 10 * * *' action=chatCron.send
```

# RemoveCron
remove cron for server
```
example: removeCron id=8 serverId=chat-server-1
example: removeCron id=8 serverType=chat
```

# Blacklist
add blacklist for frontend server
```
example: blacklist 192.168.10.120 192.168.18.60
example: blacklist \b(([01]?\d?\d|2[0-4]\d|25[0-5])\.){3}([01]?\d?\d|2[0-4]\d|25[0-5])\b
```

# Run
run script in server
```
example: run app.get("sessionService").getSessionsCount()
example: run app.isMaster()
```

### Inspecting the snapshot  

Open [Google Chrome](https://www.google.com/intl/en/chrome/browser/) and press F12 to open the developer toolbar.  

Go to the `Profiles` tab, right-click in the tab pane and select
`Load profile...`.

Select the dump file and click `Open`.  You can now inspect the heap snapshot
at your leisure.

for more infos about dump you can visit [ndump](https://github.com/piaohai/ndump)  