[![Build Status](https://travis-ci.org/node-pinus/pinus-loader.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-loader)

#pinus-loader - loader module for pinus
pinus中使用Convention over Configuration的形式管理工程目录，不同的功能按约定放在不同的目录下。pinus-loader为pinus提供了按目录加载模块的功能。

pinus-rpc可以批量加载指定目录下的模块，挂到一个空对象下返回（但不会递归加载子目录），同时提供模块命名机制。

+ Tags: node.js

##规则说明
模块命名

模块默认以文件名为名。如：加载lib/a.js后，返回的结果为：{a: require('./lib/a')}。

如果模块中定义了name属性，则会以name作为模块的名称。如：
```javascript
a.js
exports.name = 'test';
```
返回的结果为：{test: require('./lib/a')}

模块定义

如果模块以function的形式暴露出去，则这个function会被当作构造模块实例的工厂方法，Loader会调用这个function获取模块的实例，同时可以传递一个context参数作为工厂方法的参数。其他情况则直接把加载到的模块返回。
```javascript
module.exports = function(context) {
  return {};  // return some module instance
};
```

##安装
```
npm install pinus-loader
```

##用法
``` javascript
var Loader = require('pinus-loader');

var res = Loader.load('.');
console.log('res: %j', res);
```
模块定义成函数，加载

##API
###Loader.load(path, context)
加载path目录下所有模块。如果模本身是一个function，则把这个function作为获取模块的工厂方法，通过调用这个方法获取到模块实例;否则直接返回加载到的模块。
####参数
+ path 加载的目录
+ context 如果通过工厂方法加载模块，会将该参数作为初始化参数传给工厂方法。
