import * as http from 'http';
let envConfig = require('./app/config/env.json');
let config = require('./app/config/' + envConfig.env + '/config');
let path = __filename.substring(0, __filename.lastIndexOf('/'));
import { Robot } from 'pinus-robot';
import * as cluster from 'cluster';

let robot = new Robot(config);

function run(num) {
    for (let i = 0; i < num; i++) {
        cluster.fork();
    }
}

function stop() {
    for (let id in cluster.workers) {
        cluster.workers[id].process.kill();
    }
}

function startHttp() {
    http.createServer(function (req, res) {
        if (req.method === 'GET') {
            let url = require('url').parse(req.url, true);
            if (url.pathname === '/') {
                return res.end(JSON.stringify(config) + '\n');
            } else if (url.pathname === '/set') {
                for (let key in url.query) {
                    config['apps'][key] = (typeof config[key] === 'number') ? +url.query[key] : url.query[key];
                }
                return res.end(JSON.stringify(config) + '\n');
            } else if (url.pathname === '/restart') {
                require('child_process').exec('sudo restart client', function () { });
                return res.end('OK\n');
            } else if (url.pathname === '/pull') {
                require('child_process').exec('cd /home/ubuntu/hello && git pull ', function () { });
                return res.end('OK\n');
            } else if (url.pathname === '/stop') {
                setTimeout(function () { stop(); }, 1000);
                return res.end('HTTP SERVER CLOSE OK\n');
            } else if (url.pathname === '/start') {
                let num = url.query['num'] || 1;
                run(num);
                return res.end('OK\n' + num);
            }
        }
        res.writeHead(404);
        res.end('<h1>404<h1>\n');
    }).listen(config.master.cwebport);
    console.log(' http server start at http://127.0.0.1:' + config.master.cwebport);
}

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
    require('fs').writeFileSync('/tmp/log', err.stack, 'utf8');
});

if (cluster.isMaster) {
    startHttp();
} else {
    robot.runAgent(path + envConfig.script);
}

