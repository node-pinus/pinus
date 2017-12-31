[![Build Status](https://travis-ci.org/node-pinus/pinus-rpc.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-rpc)

#pinus-rpc - rpc framework for pinus
pinus-rpc是pinus项目底层的rpc框架，提供了一个多服务器进程间进行rpc调用的基础设施。
pinus-rpc分为客户端和服务器端两个部分。
客户端部分提供了rpc代理生成，消息路由和网络通讯等功能，并支持动态添加代理和远程服务器配置。
服务器端提供了远程服务暴露，请求派发，网络通讯等功能。

远程服务代码加载由pinus-loader模块完成，相关规则可以参考https://github.com/node-pinus/pinus-loader

+ Tags: node.js

##安装
```
npm install pinus-rpc
```

##用法
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
创建一个rpc server实例。根据配置信息加载远程服务代码，并生成底层acceptor。
###参数
+ opts.port - rpc server监听端口
+ opts.paths - 远程服务信息列表, [{namespace: 远程服务名字空间, path: 远程服务代码目录}, ...].
+ opts.context - 传递给远程服务的上下文信息。
+ opts.acceptorFactory(opts, msgCB) - （可选）opts.port：监听的端口，opts.services：已加载的远程服务集合，结构为：{namespace: {name: service}}。msgCB(msg, cb)：消息到达回调。该方法返回返回值为acceptor实例。

###server.start
启动rpc server实例。

###server.stop
停止rpc server实例，关闭底层的acceptor监听。

###Acceptor
负责rpc server底层的监听和rpc协议的具体实现。可以通过传入acceptorFactory来定制自己的acceptor，从而实现不同的rpc协议和策略。

###acceptor.listen(port)
让acceptor实例开始监听port端口。

###acceptor.close
关闭acceptor实例。

##Client API
###Client.create(opts)
创建一个rpc client实例。根据配置生成代理。
####参数
+ opts.context - 传递给mailbox的上下文信息。
+ opts.routeContext - （可选）传递给router函数的上下文。
+ opts.router(routeParam, msg, routeContext, cb) - （可选）rpc消息路由函数。其中，routeParam是路由的相关的参数，对应于rpc代理第一个参数，可以通过这个参数传递请求用户的相关信息，如session; msg是rpc的描述消息; routeContext是opts.routeContext。
+ opts.mailBoxFactory(serverInfo, opts) - （可选）构建mailbox实例的工厂方法。

###client.addProxies(records)
加载新的代理代码。
####参数
+ records - 代理代码的配置信息列表。格式：[{namespace: service_name_space, serverType: remote_server_type, path: path_to_remote_service_interfaces}];

###client.addServers(servers)
添加新的远程服务器配置信息。
####参数
+ servers - 远程服务器信息列表。格式：[{id: remote_server_id, serverType: remote_server_type, host: remote_server_host, port: remote_server_port}]

###client.start(cb)
启动rpc client实例，之后可以通过代理或rpcInvoke方法发起远程调用。

###client.stop
关闭rpc client实例，并停止底层所有mailbox。

###client.rpcInvoke(serverId, msg, cb)
直接发起rpc调用。
####参数
+ serverId - 远程服务器的id。
+ msg - rpc描述消息，格式：{namespace: 远程服务命名空间, serverType: 远程服务器类型, service: 远程服务名称, method: 远程服务方法名, args: 远程方法调用参数列表}。
+ cb - 远程服务调用结果回调。

###MailBox
负责rpc cliente底层的连接和rpc协议的具体实现。一个mailbox实例对应一个远程服务器。可以通过传入mailBoxFactory来定制自己的mailbox，从而实现不同的rpc协议和策略。

###mailbox.connect(cb)
让mailbox实例连接到目标服务器。

###mailbox.close
关闭mailbox实例。

###mailbox.send(msg, opts, cb)
让mailbox实例发送rpc消息到关联的远程服务器。
####参数
+ msg - rpc描述消息，参考clienet.rpcInvoke。
+ opts - send操作的附加选项，预留，暂时无用。
+ cb - rpc回调函数。