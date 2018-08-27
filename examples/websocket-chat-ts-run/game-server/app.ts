import {pinus} from 'pinus';
import * as  routeUtil from './app/util/routeUtil';
import {preload} from './preload';
import {createRobotPlugin} from 'pinus-robot-plugin';

import _pinus = require('pinus');

const filePath = (_pinus as any).FILEPATH;
filePath.MASTER = '/config/master';
filePath.SERVER = '/config/servers';
filePath.CRON = '/config/crons';
filePath.LOG = '/config/log4js';
filePath.SERVER_PROTOS = '/config/serverProtos';
filePath.CLIENT_PROTOS = '/config/clientProtos';
filePath.MASTER_HA = '/config/masterha';
filePath.LIFECYCLE = '/lifecycle';
filePath.SERVER_DIR = '/app/servers/';
filePath.CONFIG_DIR = '/config';

const adminfilePath = _pinus.DEFAULT_ADMIN_PATH;
adminfilePath.ADMIN_FILENAME = 'adminUser';
adminfilePath.ADMIN_USER = 'config/adminUser';
/**
 *  替换全局Promise
 *  自动解析sourcemap
 *  捕获全局错误
 */
preload();

/**
 * Init app for client.
 */
let app = pinus.createApp();
app.set('name', 'chatofpomelo-websocket');

// app configuration
app.configure('production|development', 'connector', function () {
    app.set('connectorConfig',
        {
            connector: pinus.connectors.hybridconnector,
            heartbeat: 3,
            useDict: true,
            useProtobuf: true
        });
});

app.configure('production|development', 'gate', function () {
    app.set('connectorConfig',
        {
            connector: pinus.connectors.hybridconnector,
            useProtobuf: true
        });
});

// app configure
app.configure('production|development', function () {
    // route configures
    app.route('chat', routeUtil.chat);

    // filter configures
    app.filter(new pinus.filters.timeout());
});

app.configure('development', function () {
    // enable the system monitor modules
    app.enable('systemMonitor');
});

if (app.isMaster()) {
    //   app.use(createRobotPlugin({scriptFile: __dirname + '/robot/robot.js'}));
}

// start app
app.start();