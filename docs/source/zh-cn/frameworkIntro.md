# pinus架构概览
pinus之所以简单易用、功能全面，并且具有高可扩展性、可伸缩性等特点，这与它的技术选型和方案设计是密不可分的。在研究大量游戏引擎设计思路基础上，结合以往游戏开发的经验，确定了pinus框架的设计方案。

## pinus为什么采用node.js开发？
node.js自身特点与游戏服务器的特性惊人的吻合。 在node.js的官方定义中， fast、scalable、realtime、network这几个特性都非常符合游戏服务器的要求。游戏服务器是个网络密集型的应用，对实时性要求极高，而node.js在网络io上的优势也完全可以满足这点。使用node.js开发游戏服务器的优势总结：
*  io与可伸缩性的优势。io密集型的应用采用node.js是最合适的， 可达到最好的可伸缩性。
*  多进程单线程的应用架构。node.js天生采用单线程， 使它在处理复杂逻辑的时候无需考虑线程同步、锁、死锁等一系列问题， 减少了很多逻辑错误。 由多进程node.js组成的服务器群是最理想的应用架构。
*  语言优势。使用javascript开发可以实现快速迭代，如果客户端使用html 5，更可实现代码共用。

## 游戏服务器的运行架构

一个真正高可扩展的游戏运行架构必须是多进程的。google的[gritsgame](http://code.google.com/p/gritsgame/),  mozilla的[browserquest](https://github.com/mozilla/BrowserQuest) 都采用了node.js作为游戏服务器开发语言， 但它们都采用了单进程的node.js服务器，缺乏扩展性，这使它们可以支撑的在线用户数量是很有限的（这两个游戏主要是作为HTML5游戏的demo）。而多进程的架构可以很好的实现游戏服务器的的扩展性，达到支撑较多在线用户、降低服务器压力等要求。

### 一个典型的多进程MMO运行架构， 如下图所示：


 ![MMO运行架构](http://pinus.netease.com/resource/documentImage/mmoArchitecture.png)


说明： 上图中的方块表示进程， 定义上等同于“服务器“

#### 运行架构说明：
* 客户端通过websocket长连接连到connector服务器群。
* connector负责承载连接，并把请求转发到后端的服务器群。
* 后端的服务器群主要包括按场景分区的场景服务器(area)、聊天服务器(chat)和状态服务器等(status)， 这些服务器负责各自的业务逻辑。真实的案例中还会有各种其它类型的服务器。
* 后端服务器处理完逻辑后把结果返回给connector， 再由connector广播回给客户端。
* master负责统一管理这些服务器，包括各服务器的启动、监控和关闭等功能。

### 游戏运行架构与web应用运行架构的区别
该游戏运行架构表面上看与web应用运行架构很类似，connector类似于web应用的apache/nginx等web服务器，后端的服务器群类似于web应用中的应用服务器（如tomcat），但实际上存在着很大的差别：
* 长连接与短连接。web应用使用基于http的短连接以达到最大的可扩展性，游戏应用采用基于socket(websocket)的长连接，以达到最大的实时性。
* 分区策略不同。web应用的分区可以根据负载均衡自由决定， 而游戏则是基于场景(area)的分区模式， 这使同场景的玩家跑在一个进程内， 以达到最少的跨进程调用。
* 有状态和无状态。web应用是无状态的， 可以达到无限的扩展。 而游戏应用则是有状态的， 由于基于场景的分区策略，它的请求必须路由到指定的服务器， 这也使游戏达不到web应用同样的可扩展性。
* 广播模式和request/response模式。web应用采用了基于request/response的请求响应模式。而游戏应用则更频繁地使用广播， 由于玩家在游戏里的行动要实时地通知场景中的其它玩家， 必须通过广播的模式实时发送。这也使游戏在网络通信上的要求高于web应用。

### 如此复杂的运行架构， 我们需要一个框架来简化开发
游戏的运行架构很复杂，要想支撑起如此复杂的运行架构，必须要有一个框架来简化开发。
pinus正是这样一个框架，它使我们用最少的代码， 最清晰的结构来实现复杂的运行架构。

## pinus的框架介绍

pinus framework的组成架构如图所示：


 ![pinus框架](http://pinus.netease.com/resource/documentImage/pinus-arch.png)


* server management, pinus是个真正多进程、分布式的游戏服务器。因此各游戏server(进程)的管理是pinus很重要的部分，框架通过抽象使服务器的管理非常容易。
* network, 请求、响应、广播、RPC、session管理等构成了整个游戏框架的脉络，所有游戏流程都构建在这个脉络上。
* application, 应用的定义、component管理，上下文配置， 这些使pinus framework的对外接口很简单， 并且具有松耦合、可插拔架构。


### pinus的架构设计目标
* 服务器（进程）的抽象与扩展

在web应用中， 每个服务器是无状态、对等的， 开发者无需通过框架或容器来管理服务器。
但游戏应用不同， 游戏可能需要包含多种不同类型的服务器，每类服务器在数量上也可能有不同的需求。这就需要框架对服务器进行抽象和解耦，支持服务器类型和数量上的扩展。

* 客户端的请求、响应、广播

客户端的请求、响应与web应用是类似的， 但框架是基于长连接的， 实现模式与http请求有一定差别。
广播是游戏服务器最频繁的操作， 需要方便的API， 并且在性能上达到极致。

* 服务器间的通讯、调用

尽管框架尽量避免跨进程调用，但进程间的通讯是不可避免的， 因此需要一个方便好用的RPC框架来支撑。

＊ 松耦合、可插拔的应用架构。

应用的扩展性很重要， pinus framework支持以component的形式插入任何第三方组件, 也支持加入自定义的路由规则， 自定义的filter等。

下面分别对这三个目标进行详细的分析：

### 服务器（进程）的抽象与扩展介绍

#### 服务器的抽象与分类
该架构把游戏服务器做了抽象， 抽象成为两类：前端服务器和后端服务器， 如图：


![服务器抽象](http://pinus.netease.com/resource/documentImage/serverAbstraction.png)

 
前端服务器(frontend)的职责：
 * 负责承载客户端请求的连接
 * 维护session信息
 * 把请求转发到后端
 * 把后端需要广播的消息发到前端

后端服务器(backend)的职责：
 * 处理业务逻辑， 包括RPC和前端请求的逻辑
 * 把消息推送回前端

#### 服务器的鸭子类型
动态语言的面向对象有个基本概念叫鸭子类型。
服务器的抽象也同样可以比喻为鸭子， 服务器的对外接口只有两类， 一类是接收客户端的请求， 叫做handler， 一类是接收RPC请求， 叫做remote， handler和remote的行为决定了服务器长什么样子。
因此我们只要定义好handler和remote两类的行为， 就可以确定这个服务器的类型。

#### 服务器抽象的实现
利用目录结构与服务器对应的形式， 可以快速实现服务器的抽象。

以下是示例图：
![目录结构](http://pinus.netease.com/resource/documentImage/directory.png)
 
图中的connector, area, chat三个目录代表三类服务器类型， 每个目录下的handler与remote决定了这个服务器的行为（对外接口）。 开发者只要往handler与remote目录填代码， 就可以实现某一类的服务器。这让服务器实现起来非常方便。
让服务器动起来， 只要填一份配置文件servers.json就可以让服务器快速动起来。
配置文件内容如下所示：
 
```json
{
  "development":{
    "connector": [
      {"id": "connector-server-1", "host": "127.0.0.1", "port": 3150, "clientPort":3010, "frontend":true},
      {"id": "connector-server-2", "host": "127.0.0.1", "port": 3151, "clientPort":3011, "frontend":true}
    ],
    "area": [
      {"id": "area-server-1", "host": "127.0.0.1", "port": 3250, "area": 1},
      {"id": "area-server-2", "host": "127.0.0.1", "port": 3251, "area": 2},
      {"id": "area-server-3", "host": "127.0.0.1", "port": 3252, "area": 3}
    ],
    "chat":[
      {"id":"chat-server-1","host":"127.0.0.1","port":3450}
    ]
   }
}
```


###  客户端请求与响应、广播的抽象介绍
所有的web应用框架都实现了请求与响应的抽象。尽管游戏应用是基于长连接的， 但请求与响应的抽象跟web应用很类似。
下图的代码是一个request请求示例：
 

![请求示例](http://pinus.netease.com/resource/documentImage/request.png)


请求的api与web应用的ajax请求很象，基于Convention over configuration的原则， 请求不需要任何配置。 如下图所示，请求的route字符串：chat.chatHandler.send， 它可以将请求分发到chat服务器上chatHandler文件定义的send方法。
 
Pinus的框架里还实现了request的filter机制，广播/组播机制，详细介绍见[pinus框架参考](https://github.com/node-pinus/pinus/wiki/Pinus-Framework)。

###  服务器间RPC调用的抽象介绍
架构中各服务器之间的通讯主要是通过底层RPC框架来完成的，该RPC框架主要解决了进程间消息的路由和RPC底层通讯协议的选择两个问题。
服务器间的RPC调用也实现了零配置。实例如下图所示：
 

![rpc调用](http://pinus.netease.com/resource/documentImage/rpcInterface.png)


上图的remote目录里定义了一个RPC接口： chatRemote.js，它的接口定义如下：
```
chatRemote.kick = function(uid, player, cb) {
}
```
其它服务器（RPC客户端）只要通过以下接口就可以实现RPC调用：
```
app.rpc.chat.chatRemote.kick(session, uid, player, function(data){
});
```
这个调用会根据特定的路由规则转发到特定的服务器。（如场景服务的请求会根据玩家在哪个场景直接转发到对应的server）。
RPC框架目前在底层采用socket.io作为通讯协议，但协议对上层是透明的，以后可以替换成任意的协议。

### pinus支持可插拔的component扩展架构
component是pinus自定义组件，开发者可自加载自定义的component。
component在[pinus框架参考](https://github.com/node-pinus/pinus/wiki/Pinus-Framework)将有更深入的讨论。
以下是component的生命周期图：

![components](http://pinus.netease.com/resource/documentImage/components.png)


用户只要实现component相关的接口： start, afterStart, stop, 就可以加载自定义的组件：

```javascript
app.load([name], comp, [opts])
```

## 总结
上面的应用框架构成了pinus framework的基础。在此基础上，配合pinus提供的游戏开发库和相关工具集，开发游戏服务器将变得非常方便。 后面的[tutorial](quickstart.html)将带我们进入开发游戏应用的实际案例。