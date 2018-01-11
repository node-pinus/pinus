

import {createServer} from '../index';

// remote service path info list
let paths = [
  {
    serverType: 'test',
    namespace: 'user', path: __dirname + '/remote/test'}
];



function runServer(port: number) {

    let server = createServer({paths: paths, port: port});
    server.start();
    console.log('rpc server started.' + port);
}



runServer(3333);
runServer(3334);


process.on('uncaughtException', function(err) {
    console.error(err);
});
