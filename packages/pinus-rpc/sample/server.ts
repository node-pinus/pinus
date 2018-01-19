require('source-map-support/register');
import {preload} from './preload';
preload();
import {createServer, createTcpAcceptor} from '../index';
import { configure } from 'pinus-logger';
import {getLogger} from 'pinus-logger';
configure('./config/log4js.json');
let logger = getLogger('pinus-rpc', 'sample-server');

// remote service path info list
let paths = [
  {
    serverType: 'test',
    namespace: 'user', path: __dirname + '/remote/test'}
];



function runServer(port: number) {

    let server = createServer({paths: paths, port: port, rpcDebugLog: true,
        rpcLogger: logger,
        acceptorFactory: createTcpAcceptor
    });
    server.start();
    console.log('rpc server started.' + port);
}



runServer(3333);
runServer(3334);
setTimeout(() => runServer(3335), 5000);


process.on('uncaughtException', function(err) {
    console.error(err);
});
