import * as os from 'os';
import * as admin from 'pinus-admin';
import * as utils from './utils';
import * as Constants from './constants';
import * as pathUtil from './pathUtil';
import * as starter from '../master/starter';
import { getLogger } from 'pinus-logger'; import { Application } from '../application';
import { ConsoleService, IModule, IModuleFactory } from 'pinus-admin';
import { MasterWatcherModule } from '../modules/masterwatcher';
import { MonitorWatcherModule } from '../modules/monitorwatcher';
import { WatchServerModule } from '../modules/watchServer';
import { OnlineUserModule } from '../modules/onlineUser';
import { ConsoleModule } from '../modules/console';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


export interface ModuleRecord {
    module: IModuleFactory | IModule;
    moduleId: string;
    opts: any;
}
/**
 * Load admin modules
 */
export function loadModules(self: {app: Application , modules: Array<IModule>}, consoleService: ConsoleService) {
    // load app register modules
    let _modules = self.app.get(Constants.KEYWORDS.MODULE);

    if (!_modules) {
        return;
    }

    let modules = [];
    for (let m in _modules) {
        modules.push(_modules[m]);
    }

    let record, moduleId, module;
    for (let i = 0, l = modules.length; i < l; i++) {
        record = modules[i];
        if (typeof record.module === 'function') {
            module = new record.module(record.opts, consoleService);
        } else {
            module = record.module;
        }

        moduleId = record.moduleId || module.moduleId;

        if (!moduleId) {
            logger.warn('ignore an unknown module.');
            continue;
        }

        consoleService.register(moduleId, module);
        self.modules.push(module);
    }
}

export function startModules(modules: IModule[], cb: (err?: Error) => void) {
    // invoke the start lifecycle method of modules

    if (!modules) {
        return;
    }
    startModule(null, modules, 0, cb);
}

/**
 * Append the default system admin modules
 */
export function registerDefaultModules(isMaster: boolean, app: Application, closeWatcher: boolean) {
    if (!closeWatcher) {
        if (isMaster) {
            app.registerAdmin(MasterWatcherModule, { app: app });
        } else {
            app.registerAdmin(MonitorWatcherModule, { app: app });
        }
    }
    app.registerAdmin(WatchServerModule, { app: app });
    app.registerAdmin(ConsoleModule, { app: app, starter: starter });
    if (app.enabled('systemMonitor')) {
        if (os.platform() !== Constants.PLATFORM.WIN) {
            app.registerAdmin(admin.modules.systemInfo);
            app.registerAdmin(admin.modules.nodeInfo);
        }
        app.registerAdmin(OnlineUserModule);
        app.registerAdmin(admin.modules.monitorLog, { path: pathUtil.getLogPath(app.getBase()) });
        app.registerAdmin(admin.modules.scripts, { app: app, path: pathUtil.getScriptPath(app.getBase()) });
        if (os.platform() !== Constants.PLATFORM.WIN) {
            app.registerAdmin(admin.modules.profiler);
        }
    }
}

let startModule = function (err: Error, modules: IModule[], index: number, cb: (err?: Error) => void) {
    if (err || index >= modules.length) {
        utils.invokeCallback(cb, err);
        return;
    }

    let module = modules[index];
    if (module && typeof module.start === 'function') {
        module.start((err) => {
            startModule(err, modules, index + 1, cb);
        });
    } else {
        startModule(err, modules, index + 1, cb);
    }
};
