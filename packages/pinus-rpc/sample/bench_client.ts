import { RpcClient, RpcMsg, RouteContext, RouteServers } from '../index';

// remote service interface path info list
let records = [{
  namespace: 'user',
  serverType: 'test',
  path: __dirname + '/remote/test'
}];

let context = {
  serverId: 'test-server-1'
};

// server info list
let servers =
  [{
    id: 'test-server-1',
    serverType: 'test',
    host: '127.0.0.1',
    port: 3333
  }];
// route parameter passed to route function
let routeParam: string = null;

// route context passed to route function
let routeContext = servers;


// route function to caculate the remote server id
let routeFunc = function (session: { [key: string]: any }, msg: RpcMsg, context: RouteServers, cb: (err: Error, serverId?: string) => void) {
  cb(null, context[0].id);
};

let client = new RpcClient({
  routeContext: servers,
  router: routeFunc,
  context: context
});

let start: number = null;
client.start(function (err) {
  console.log('rpc client start ok.');

  client.addProxies(records);
  client.addServers(servers);

  start = Date.now();
  run();
});

let num_requests = 100000;
let times = 0;
let mock_data_1 = 'hello';
let mock_data_2 = 'hello';

let num_repeat = 200; // 100 200 300 400 800

for (let i = 0; i < num_repeat; i++) {
  mock_data_2 += mock_data_1;
}
let mock_data_3 = {
  a: 'run',
  b: mock_data_2 + Date.now() + '_',
  time: Date.now()
};

let payload = mock_data_3;

// console.log(new Buffer(payload).length / 1024 + 'k');
console.log(new Buffer(JSON.stringify(payload)).length / 1024 + 'k');

async function run() {
  if (times > num_requests) {
    return;
  }

  if (times == num_requests) {
    let now = Date.now();
    let cost = now - start;
    console.log('run %d num requests cost: %d ops/sec', num_requests, cost, (num_requests / (cost / 1000)).toFixed(2));
    times = 0;
    start = now;
    // return;
    await run();
    return;
  }

  times++;
  await rpcRequest(payload);
  run();
}

async function rpcRequest(param: any) {
  let result = await client.proxies.user.test.service.echo(routeParam, mock_data_1, 123);
  //console.log("result:" , result);
}