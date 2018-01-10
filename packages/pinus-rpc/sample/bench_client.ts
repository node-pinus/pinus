// import * as bluebird from "bluebird"



// // 使用bluebird输出完整的promise调用链
// global.Promise = bluebird.Promise;
// // 开启长堆栈
// bluebird.config({
//     // Enable warnings
//     warnings: false,
//     // Enable long stack traces
//     longStackTraces: false,
//     // Enable cancellation
//     cancellation: false,
//     // Enable monitoring
//     monitoring: false
// });


import { RpcClient, RpcMsg, RouteContext, RouteServers } from '../index';

// remote service interface path info list
var records = [{
  namespace: 'user',
  serverType: 'test',
  path: __dirname + '/remote/test'
}];

var context = {
  serverId: 'test-server-1'
};

// server info list
var servers =
  [{
    id: 'test-server-1',
    serverType: 'test',
    host: '127.0.0.1',
    port: 3333
  }]
// route parameter passed to route function
var routeParam: string = null;

// route context passed to route function
var routeContext = servers;


// route function to caculate the remote server id
var routeFunc = function (session: { [key: string]: any }, msg: RpcMsg, context: RouteServers, cb: (err: Error, serverId?: string) => void) {
  cb(null, context[0].id);
};

var client = new RpcClient({
  routeContext: servers,
  router: routeFunc,
  context: context
});

var start: number = null;
client.start(async function (err) {
  console.log('rpc client start ok.');

  client.addProxies(records);
  client.addServers(servers);

  start = Date.now();
  //runSerial();
  //runParallels();
  runOnlySends();
});

var num_requests = 100000;
var times = 0;
var mock_data_1 = 'hello';
var mock_data_2 = 'hello';

var num_repeat = 200; // 100 200 300 400 800

for (var i = 0; i < num_repeat; i++) {
  mock_data_2 += mock_data_1;
}
var mock_data_1 = "abcdefg";
var mock_data_3 = {
  a: 'run',
  b: mock_data_2 + Date.now() + '_',
  time: Date.now()
}

var payload = mock_data_3;

// console.log(new Buffer(payload).length / 1024 + 'k');
console.log(new Buffer(JSON.stringify(payload)).length / 1024 + 'k');

async function runParallels() {
  let maxParallel = 1;
  while (true) {
    if (maxParallel > 10000) {
      maxParallel = 10000;
    }
    var now = Date.now();
    start = now;
    await runParallel(maxParallel);

    var now = Date.now();
    var cost = now - start;
    console.log(`runParallel ${num_requests} num requests(maxParallel:${maxParallel}) cost ${cost}ms , ${(num_requests / (cost / 1000)).toFixed(2)}ops/sec`);

    maxParallel = maxParallel * 2;
  }
}

async function runParallel(maxParallel: number) {
  let all = [];
  for (let times = 0; times < num_requests; times++) {
    all.push(rpcRequest(payload));
    if (all.length == maxParallel) {
      await Promise.all(all);
      all.length = 0;
    }
  }
  await Promise.all(all);
}

async function runSerial() {
  if (times > num_requests) {
    return;
  }

  if (times == num_requests) {
    var now = Date.now();
    var cost = now - start;
    console.log(`runSerial ${num_requests} num requests cost ${cost}ms , ${(num_requests / (cost / 1000)).toFixed(2)}ops/sec`);
    times = 0;
    start = now;
    // return;
    await runSerial();
    return;
  }

  times++;
  await rpcRequest(payload);
  runSerial();
}

async function rpcRequest(param: any) {
  var result = await client.proxies.user.test.service.echo(routeParam, mock_data_1, 123);
  //console.log(count++);
}





async function runOnlySends() {
  let maxParallel = 1;
  while (true) {
    if (maxParallel > 10000) {
      maxParallel = 10000;
    }
    var now = Date.now();
    start = now;
    runOnlySend(maxParallel);

    var now = Date.now();
    var cost = now - start;
    console.log(`runOnlySend ${num_requests} num requests(maxParallel:${maxParallel}) cost ${cost}ms , ${(num_requests / (cost / 1000)).toFixed(2)}ops/sec`);

    maxParallel = maxParallel * 2;
  }
}

function runOnlySend(maxParallel: number) {
  for (let times = 0; times < num_requests; times++) {
    rpcRequest(payload);
  }
}
