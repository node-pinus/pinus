[![Build Status](https://travis-ci.org/node-pinus/pinus-rpc.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-rpc)

#pinus-rpc - rpc framework for pinus

pinus-rpc is the low level RPC framework for pinus project. It contains two parts: client and server.

The client part generates the RPC client proxy, routes the message to the appropriate remote server and manages the network communications. Support add proxies and remote server information dynamically.

The server part exports the remote services, dispatches the remote requests to the services and also manages the network communications.

And the remote service codes would loaded by pinus-loader module and more details please access this [link](https://github.com/node-pinus/pinus-loader).

+ Tags: node.js

##Installation
```
npm install pinus-rpc
```

##Usage
###Server
``` javascript
var Server = require('pinus-rpc').server;

// remote service path info list
var paths = [
  {namespace: 'user', path: __dirname + '/remote/test'}
];

var port = 3333;

var server = Server.create({paths: paths, port: port});
server.start();
console.log('rpc server started.');
```

###Client
``` javascript
var Client = require('pinus-rpc').client;

// remote service interface path info list
var records = [
  {namespace: 'user', serverType: 'test', path: __dirname + '/remote/test'}
];

// server info list
var servers = [
  {id: 'test-server-1', serverType: 'test', host: '127.0.0.1', port: 3333}
];

// route parameter passed to route function
var routeParam = null;

// route context passed to route function
var routeContext = servers;

// route function to caculate the remote server id
var routeFunc = function(routeParam, msg, routeContext, cb) {
  cb(null, routeContext[0].id);
};

var client = Client.create({routeContext: routeContext, router: routeFunc});

client.start(function(err) {
  console.log('rpc client start ok.');

  client.addProxies(records);
  client.addServers(servers);

  client.proxies.user.test.service.echo(routeParam, 'hello', function(err, resp) {
    if(err) {
      console.error(err.stack);
    }
    console.log(resp);
  });
});
```

##Server API
###Server.create(opts)
Create a RPC server instance. Intitiate the instance and acceptor with the configure.
###Parameters
+ opts.port - rpc server listening port.
+ opts.paths - remote service path infos, format: [{namespace: remote service namespace, path: remote service path}, ...].
+ opts.context - remote service context.
+ opts.acceptorFactory(opts, msgCB) - (optional) acceptor factory method. opts.port：port that acceptor would listen，opts.services：loaded remote services，format: {namespace: {name: service}}. msgCB(msg, cb): remote request arrived callback. the method should return a acceptor instance.

###server.start
Start the remote server instance.

###server.stop
Stop the remote server instance and the acceptor.

###Acceptor
Implement the low level network communication with specified protocol. Customize the protocol by passing an acceptorFactory to return different acceptors.

###acceptor.listen(port)
Listen the specified port.

###acceptor.close
Stop the acceptor.

##Client API
###Client.create(opts)
Create an RPC client instance which would generate proxies for the RPC client.
####Parameters
+ opts.context - context for mailbox.
+ opts.routeContext - (optional)context for route function.
+ opts.router(routeParam, msg, routeContext, cb) - (optional) route function which decides the RPC message should be send to which remote server. routeParam: route parameter, msg: RPC descriptioin message, routeContext: opts.routeContext.
+ opts.mailBoxFactory(serverInfo, opts) - (optional) mail box factory method.

###client.addProxies(records)
Load new proxy codes.
####Parameters
+ records - new proxy code configure information list。Format: [{namespace: service_name_space, serverType: remote_server_type, path: path_to_remote_service_interfaces}];

###client.addServers(servers)
Add new remote server informations.
####Parameters
+ servers - remote server information list. Format: [{id: remote_server_id, serverType: remote_server_type, host: remote_server_host, port: remote_server_port}]

###client.start(cb)
Start the RPC client.

###client.stop
Stop the RPC client and stop all the mail box connections to remote servers.

###client.rpcInvoke(serverId, msg, cb)
Invoke an RPC request.
####Parameters
+ serverId - remote server id.
+ msg - RPC description message. format: {namespace: remote service namespace, serverType: remote server type, service: remote service name, method: remote service method name, args: remote service args}.
+ cb - remote service callback function.

###MailBox
Implement the low level network communication with remote server. A mail box instance stands for a remote server. Customize the protocol by passing a mailBoxFactory parameter to client to return different mail box instances.

###mailbox.connect(cb)
Connect to the remote server.

###mailbox.close
Close mail box instance and disconnect with the remote server.

###mailbox.send(msg, opts, cb)
Send the RPC message to the associated remote server.
####Parameters
+ msg - RPC description message, see also clienet.rpcInvoke.
+ opts - reserved.
+ cb - RPC callback function.