
#### 1.4.x




#### 1.4.11 

[template] [添加了打包时对配置文件的复制处理](https://github.com/node-pinus/pinus/pull/138)

[pinus]  [DictionaryComponent 添加选项 ignoreAutoRouter](https://github.com/node-pinus/pinus/commit/780b0efa105d4b2438cd7c7a289dc0dc0e49541a)

> 可以自主控制dict的序号id.

```
// app.set('dictionaryConfig',{dict,ignoreAutoRouter})
export interface DictionaryComponentOptions {
    dict?: string;
    // 不自动按照路由生成router,仅使用 config/dictionary 内的路由.
    // 这样路由的 id 就可以通过dictionary的顺序来控制了,方便proto变更不影响原顺序id (为也热更新考虑)
    // 另外这样也少一次load handler
    ignoreAutoRouter?: boolean;
}
```


[pinus-rpc]  [origin基本是Error或其它扩展过的Error对象，cloneError会导致message等其它信息丢失](https://github.com/whtiehack/pinus/issues/141)

[examples] : component 示例.

[pinus] [fix for lower typescript version.](https://github.com/node-pinus/pinus/commit/9e54887cfd8c863d66b9c3ec23f9cfd5833211cf)

[all] [统一跨平台下编译文件的换行符"LF"](https://github.com/whtiehack/pinus/issues/152)




#### 1.4.10

[pinus] [修复win10 mqtt 超时问题](https://github.com/node-pinus/pinus/pull/137)


#### 1.4.9

[pinus-protobuf]: [在开启encode缓存时,优化protobuf encode性能. (提升1倍)](https://github.com/node-pinus/pinus/commit/721eda3437fdc1e704a426718776c72b073029d3)
```
 test Protobuf time: 914.453ms
 Protobuf length total: 1780000

 test ProtobufCache time: 416.399ms
 ProtobufCache length total: 1780000
```

[pinus]: [fixed bug:指定服务配置auto-restart失效](https://github.com/node-pinus/pinus/pull/132)   
 
[Example]:  [add nodejs ts client.](https://github.com/node-pinus/pinus/commit/bdcdc9bdbccdff6aeecfbfe8b18ec43f42228d76) 



#### 1.4.8

fix #128 https://github.com/node-pinus/pinus/issues/128  解决 mqtt-connection


#### 1.4.7

fix #129  https://github.com/node-pinus/pinus/issues/129

#### 1.4.6

revert 1.4.5 -> 1
revert 1.4.5 -> 3

#### 1.4.5

1. 更新 package.json,转移不需要的包到dev依赖. d58657d523c6ca1782dba1ec4c7d7d5cc62e5e22 https://github.com/node-pinus/pinus/issues/128

2. [pinus]: manualReloadCrons 添加重载前清除选项. 8c1708ee74f68a9ef583827882a36cb0e59ead28

3. tsconfig.json add opition `skipLibCheck` 解决新建的模板项目编译报错问题


#### 1.4.4

修复NPM没有编译dist的问题.

#### 1.4.3

**pinus-rpc** 修复mqtt调用延迟40～80ms的bug   https://github.com/NetEase/pomelo-rpc/pull/33

分布式部署时，servers 配置有 args参数时，自动添加空格。

Merge pull request #125 from lowkeywx/master
 Modify the log description in the application.start function

Merge pull request #126 from wjt382063576/fix_dict
 fix(dict): Fix the problem of duplicate handler routing in the dictio…


**pinus-protobuf** Encoder可选性能优化，添加Encoder缓存选项。
不优化时的逻辑是，对msg进行JSON.stringify 获取长度*2，再分配Buffer。
使用优化时的逻辑是，使用指定大小的预分配Buffer。

```js
// 指定 pinus-protobuf encode使用 buffer缓存大小
// 使用方法  在 connector配置参数
 app.set('protobufConfig', {
    // protobuf Encoder 使用 5m 的缓存 需要保证每个消息不会超过指定的缓存大小，超过了就会抛出异常
    encoderCacheSize: 5 * 1024 * 1024
 });
// 如果缓存大小不够就会有错误日志
// 缓存大小不够 日志示例
 [2020-03-27T10:44:48.752] [ERROR] pinus - [chat-server-1 channelService.js] [pushMessage] fail to dispatch msg to serverId: connector-server-1, err:RangeError [ERR_OUT_OF_RANGE]: The value of "offset" is out of range. It must be >= 0 and <= 0. Received 1
 at boundsError (internal/buffer.js:53:9)
 at writeU_Int8 (internal/buffer.js:562:5)
 at Buffer.writeUInt8 (internal/buffer.js:569:10)
 at Encoder.writeBytes (F:\develop\gong4-server\logicServer\pinus\packages\pinus-protobuf\lib\encoder.ts:195:20)

```


**pinus-protobuf** protobufConfig 配置添加一个选项 decodeCheckMsg.

解析客户端消息时校验客户端消息字段是否符合protobuf定义

因为目前发现,有的客户端encode消息没有校验消息字段是否完整,导致服务端收到消息以后字段缺失,会出现逻辑问题.

所以添加了这个选项.


**examples/websocket-chat-ts-run** 添加开启 选项 `decodeCheckMsg` 的示例. 并使用 `globalBefore` 进行捕获.


#### 1.4.2

修复web-server  更新express依赖出现的`configure`问题。

fix  #118  #119

回退 web-server express版本

fix pinus-cli lost dependency.



#### 1.4.1
try fix [#63](https://github.com/node-pinus/pinus/issues/65)  运行目录问题，先与pomelo的代码行为保持一致。

添加 error handler 和 globalfilter示例 [examples/websocket-chat-ts-run/game-server/app.ts](examples/websocket-chat-ts-run/game-server/app.ts)

修复 因为修复  [#110](https://github.com/node-pinus/pinus/issues/110) 导致的 所有日志级别都变为INFO的问题。 

#### 1.4.0

更新所有依赖库版本，并修复编译错误。
typescript 版本 3.7.2

fix [#110](https://github.com/node-pinus/pinus/issues/110)  pinus-logger 的logger对象换成原始的 log4js 对象。

#### 1.3.14

fix [#104](https://github.com/node-pinus/pinus/issues/104)

