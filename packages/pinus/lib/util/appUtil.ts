import * as async from 'async';
import * as log from './log';
import * as utils from './utils';
import * as path from 'path';
import * as fs from 'fs';
import * as Constants from './constants';
import * as starter from '../master/starter';
import * as Loader from 'pinus-loader';
import { getLogger } from 'pinus-logger'; import { Application } from '../application';
import { pinus } from '../pinus';
import { ServerInfo } from './constants';
import { IComponent, ILifeCycle } from '../index';
import { isFunction } from 'util';
let logger = getLogger('pinus', path.basename(__filename));


/**
 * Initialize application configuration.
 */
export function defaultConfiguration(app: Application) {
    let args = parseArgs(process.argv);
    setupEnv(app, args);
    loadMaster(app);
    loadServers(app);
    processArgs(app, args);
    configLogger(app);
    loadLifecycle(app);
}

/**
 * Start servers by type.
 */
export function startByType(app: Application, cb: (err?: Error) => void) {
    if (!!app.startId) {
        if (app.startId === Constants.RESERVED.MASTER) {
            utils.invokeCallback(cb);
        } else {
            starter.runServers(app);
        }
    } else {
        if (!!app.type && app.type !== Constants.RESERVED.ALL && app.type !== Constants.RESERVED.MASTER) {
            starter.runServers(app);
        } else {
            utils.invokeCallback(cb);
        }
    }
}

/**
 * Load default components for application.
 */
export function loadDefaultComponents(app: Application) {
    // load system default components
    if (app.serverType === Constants.RESERVED.MASTER) {
        app.load(pinus.components.master, app.get('masterConfig'));
    } else {
        app.load(pinus.components.proxy, app.get('proxyConfig'));
        if (app.getCurServer().port) {
            app.load(pinus.components.remote, app.get('remoteConfig'));
        }
        if (app.isFrontend()) {
            app.load(pinus.components.connection, app.get('connectionConfig'));
            app.load(pinus.components.connector, app.get('connectorConfig'));
            app.load(pinus.components.session, app.get('sessionConfig'));
            // compatible for schedulerConfig
            if (app.get('schedulerConfig')) {
                app.load(pinus.components.pushScheduler, app.get('schedulerConfig'));
            } else {
                app.load(pinus.components.pushScheduler, app.get('pushSchedulerConfig'));
            }
        }
        app.load(pinus.components.backendSession, app.get('backendSessionConfig'));
        app.load(pinus.components.channel, app.get('channelConfig'));
        app.load(pinus.components.server, app.get('serverConfig'));
    }
    app.load(pinus.components.monitor, app.get('monitorConfig'));
}

/**
 * Stop components.
 *
 * @param  {Array}  comps component list
 * @param  {Number}   index current component index
 * @param  {Boolean}  force whether stop component immediately
 * @param  {Function} cb
 */
export function stopComps(comps: IComponent[], index: number, force: boolean, cb: () => void ) {
    if (index >= comps.length) {
        utils.invokeCallback(cb);
        return;
    }
    let comp = comps[index];
    if (typeof comp.stop === 'function') {
        comp.stop(force, function () {
            // ignore any error
            stopComps(comps, index + 1, force, cb);
        });
    } else {
        stopComps(comps, index + 1, force, cb);
    }
}

/**
 * Apply command to loaded components.
 * This method would invoke the component {method} in series.
 * Any component {method} return err, it would return err directly.
 *
 * @param {Array} comps loaded component list
 * @param {String} method component lifecycle method name, such as: start, stop
 * @param {Function} cb
 */
export function optComponents(comps: IComponent[], method: string, cb: (err?: Error) => void) {
    let i = 0;
    async.forEachSeries(comps, function (comp, done) {
        i++;
        if (typeof (comp as any)[method] === 'function') {
            (comp as any)[method](done);
        } else {
            done();
        }
    }, function (err: Error) {
        if (err) {
            if (typeof err === 'string') {
                logger.error('fail to operate component, method: %s, err: %j', method, err);
            } else {
                logger.error('fail to operate component, method: %s, err: %j', method, err.stack);
            }
        }
        utils.invokeCallback(cb, err);
    });
}

export function optLifecycles(comps: ILifeCycle[], method: string, app: Application, cb: (err?: Error) => void, arg2 ?: any) {
    let i = 0;
    async.forEachSeries(comps, function (comp, done) {
        i++;
        if (typeof (comp as any)[method] === 'function') {
            (comp as any)[method](app , done , arg2);
        } else {
            done();
        }
    }, function (err: Error) {
        if (err) {
            if (typeof err === 'string') {
                logger.error('fail to operate lifecycle, method: %s, err: %j', method, err);
            } else {
                logger.error('fail to operate lifecycle, method: %s, err: %j', method, err.stack);
            }
        }
        utils.invokeCallback(cb, err);
    });
}


/**
 * Load server info from config/servers.json.
 */
let loadServers = function (app: Application) {
    app.loadConfigBaseApp(Constants.RESERVED.SERVERS, Constants.FILEPATH.SERVER);
    let servers = app.get(Constants.RESERVED.SERVERS);
    let serverMap: {[serverId: string]: ServerInfo} = {}, slist, i, l, server;
    for (let serverType in servers) {
        slist = servers[serverType];
        for (i = 0, l = slist.length; i < l; i++) {
            server = slist[i];
            server.serverType = serverType;
            if (server[Constants.RESERVED.CLUSTER_COUNT]) {
                utils.loadCluster(app, server, serverMap);
                continue;
            }
            serverMap[server.id] = server;
            if (server.wsPort) {
                logger.warn('wsPort is deprecated, use clientPort in frontend server instead, server: %j', server);
            }
        }
    }
    app.set(Constants.KEYWORDS.SERVER_MAP, serverMap);
};

/**
 * Load master info from config/master.json.
 */
let loadMaster = function (app: Application) {
    app.loadConfigBaseApp(Constants.RESERVED.MASTER, Constants.FILEPATH.MASTER);
    app.master = app.get(Constants.RESERVED.MASTER);
};

export interface ServerStartArgs extends ServerInfo {
    mode?: Constants.RESERVED.CLUSTER | Constants.RESERVED.STAND_ALONE;
    masterha ?: 'true' | 'false';
    type ?: Constants.RESERVED.ALL;
    startId ?: string;
    main ?: string;
}

/**
 * Process server start command
 */
let processArgs = function (app: Application, args: ServerStartArgs) {
    let serverType = args.serverType || Constants.RESERVED.MASTER;
    let serverId = args.id || app.getMaster().id;
    let mode = args.mode || Constants.RESERVED.CLUSTER;
    let masterha = args.masterha || 'false';
    let type = args.type || Constants.RESERVED.ALL;
    let startId = args.startId;

    app.set(Constants.RESERVED.MAIN, args.main, true);
    app.set(Constants.RESERVED.SERVER_TYPE, serverType, true);
    app.set(Constants.RESERVED.SERVER_ID, serverId, true);
    app.set(Constants.RESERVED.MODE, mode, true);
    app.set(Constants.RESERVED.TYPE, type, true);
    if (!!startId) {
        app.set(Constants.RESERVED.STARTID, startId);
    }

    if (masterha === 'true') {
        app.master = args;
        app.set(Constants.RESERVED.CURRENT_SERVER, args, true);
    } else if (serverType !== Constants.RESERVED.MASTER) {
        app.set(Constants.RESERVED.CURRENT_SERVER, args, true);
    } else {
        app.set(Constants.RESERVED.CURRENT_SERVER, app.getMaster(), true);
    }
};

/**
 * Setup enviroment.
 */
let setupEnv = function (app: Application, args: {env: string}) {
    app.set(Constants.RESERVED.ENV, args.env || process.env.NODE_ENV || Constants.RESERVED.ENV_DEV, true);
};

/**
 * Configure custom logger.
 */
let configLogger = function (app: Application) {
    if (process.env.POMELO_LOGGER !== 'off') {
        let env = app.get(Constants.RESERVED.ENV);
        let originPath = path.join(app.getBase(), Constants.FILEPATH.LOG);
        let presentPath = path.join(app.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
        if (fs.existsSync(originPath)) {
            log.configure(app, originPath);
        } else if (fs.existsSync(presentPath)) {
            log.configure(app, presentPath);
        } else {
            logger.error('logger file path configuration is error.');
        }
    }
};

/**
 * Parse command line arguments.
 *
 * @param args command line arguments
 *
 * @return Object argsMap map of arguments
 */
let parseArgs = function (args: string[]) {
    let argsMap: any = {};
    let mainPos = 1;

    while (args[mainPos].indexOf('--') > 0) {
        mainPos++;
    }
    argsMap.main = args[mainPos];

    for (let i = (mainPos + 1); i < args.length; i++) {
        let arg = args[i];
        let sep = arg.indexOf('=');
        let key = arg.slice(0, sep);
        let value = arg.slice(sep + 1);
        if (!isNaN(Number(value)) && (value.indexOf('.') < 0)) {
            value = Number(value) as any;
        }
        argsMap[key] = value;
    }

    return argsMap;
};

/**
 * Load lifecycle file.
 *
 */
let loadLifecycle = function (app: Application) {
    let filePath = path.join(app.getBase(), Constants.FILEPATH.SERVER_DIR, app.serverType, Constants.FILEPATH.LIFECYCLE);
    if (!fs.existsSync(filePath)) {
        return;
    }

    let lifecycle = require(filePath);
    if (!filePath) {
        logger.error('lifecycle.js in %s is error format.', filePath);
        return;
    }
    if (isFunction(lifecycle.default)) {
        lifecycle = lifecycle.default(app);
    } else {
        logger.error('lifecycle.js in %s is error format.', filePath);
        return;
    }
    app.usedPlugins.push(lifecycle);
};
