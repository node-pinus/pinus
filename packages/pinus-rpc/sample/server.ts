import {createServer} from '../index';
import { configure } from 'pinus-logger';
configure('./config/log4js.json');

// remote service path info list
let paths = [
  {
    serverType: 'test',
    namespace: 'user', path: __dirname + '/remote/test'}
];

let port = 3333;

let server = createServer({paths: paths, port: port});
server.start();
console.log('rpc server started.');

process.on('uncaughtException', function(err) {
    console.error(err);
});