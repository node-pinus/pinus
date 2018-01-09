import {createServer} from '../index';

// remote service path info list
var paths = [
  {
    serverType: 'test',
    namespace: 'user', path: __dirname + '/remote/test'}
];

var port = 3333;

var server = createServer({paths: paths, port: port});
server.start();
console.log('rpc server started.');

process.on('uncaughtException', function(err) {
	console.error(err);
});