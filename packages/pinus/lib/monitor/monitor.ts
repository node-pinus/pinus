/**
 * Component for monitor.
 * Load and start monitor client.
 */
import { getLogger } from 'pinus-logger';
import * as admin from 'pinus-admin';
import * as moduleUtil from '../util/moduleUtil';
import * as utils from '../util/utils';
import * as Constants from '../util/constants';
import { Application } from '../application';
import { ConsoleService, IModule } from 'pinus-admin';
import { ServerInfo } from '../util/constants';
import { ServerStartArgs } from '../util/appUtil';
import { MasterInfo } from '../index';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));

export interface MonitorOptions {
    closeWatcher ?: boolean;
}
export class Monitor {
    app: Application;
    serverInfo: ServerInfo;
    masterInfo: ServerStartArgs;
    modules: IModule[] = [];
    closeWatcher: any;
    monitorConsole: ConsoleService;

    constructor(app: Application, opts ?: MonitorOptions) {
        opts = opts || {};
        this.app = app;
        this.serverInfo = app.getCurServer();
        this.masterInfo = app.getMaster();
        this.closeWatcher = opts.closeWatcher;

        this.monitorConsole = admin.createMonitorConsole({
            id: this.serverInfo.id,
            type: this.app.getServerType(),
            host: this.masterInfo.host,
            port: this.masterInfo.port,
            info: this.serverInfo,
            env: this.app.get(Constants.RESERVED.ENV),
            authServer: app.get('adminAuthServerMonitor') // auth server function
        });
    }

    start(cb: (err?: Error) => void) {
        moduleUtil.registerDefaultModules(false, this.app, this.closeWatcher);
        this.startConsole(cb);
    }

    startConsole(cb: (err?: Error) => void) {
        moduleUtil.loadModules(this, this.monitorConsole);

        let self = this;
        this.monitorConsole.start(function (err) {
            if (err) {
                utils.invokeCallback(cb, err);
                return;
            }
            moduleUtil.startModules(self.modules, function (err) {
                utils.invokeCallback(cb, err);
                return;
            });
        });

        this.monitorConsole.on('error', function (err) {
            if (!!err) {
                logger.error('monitorConsole encounters with error: %j', err.stack);
                return;
            }
        });
    }

    stop(cb: () => void) {
        this.monitorConsole.stop();
        this.modules = [];
        process.nextTick(function () {
            utils.invokeCallback(cb);
        });
    }

    // monitor reconnect to master
    reconnect(masterInfo: MasterInfo) {
        let self = this;
        this.stop(function () {
            self.monitorConsole = admin.createMonitorConsole({
                id: self.serverInfo.id,
                type: self.app.getServerType(),
                host: masterInfo.host,
                port: masterInfo.port,
                info: self.serverInfo,
                env: self.app.get(Constants.RESERVED.ENV)
            });
            self.startConsole(function () {
                logger.info('restart modules for server : %j finish.', self.app.serverId);
            });
        });
    }
}