import { getLogger } from 'pinus-logger';
import {MonitorAgent} from './monitor/monitorAgent';
import { EventEmitter } from 'events';
import { MasterAgent, MasterAgentOptions } from './master/masterAgent';
import * as schedule from 'pinus-scheduler';
import * as protocol from './util/protocol';
import * as utils from './util/utils';
import * as util from 'util';
import { AdminServerInfo, ServerInfo, AdminUserInfo, Callback } from './util/constants';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));

let MS_OF_SECOND = 1000;

export enum ModuleType {
    push = 'push',
    pull = 'pull',
    Normal = ''
}

export type MasterCallback = (err?: string , data?: any) => void;
export type MonitorCallback = (err?: Error , data?: any) => void;

export interface IModule {
    moduleId ?: string;
    type ?: ModuleType;
    interval ?: number;
    delay ?: number;

    start?: (cb: (err?: Error) => void) => void;

    masterHandler ?: (agent: MasterAgent, msg: any, cb: MasterCallback) => void;
    monitorHandler ?: (agent: MonitorAgent, msg: any, cb: MonitorCallback) => void;
}
export interface ModuleRecord {
    moduleId: string;
    module: any;
    enable: boolean;

    delay ?: number;
    interval ?: number;
    schedule ?: boolean;

    jobId?: number;
}

export interface IModuleFactory {
    new (opts: any , consoleService ?: ConsoleService): IModule;
    moduleId: string;
}

export interface MasterConsoleServiceOpts extends MasterAgentOptions {
    master?: boolean;
    port?: number;
    env?: string;

    authUser ?: typeof utils.defaultAuthUser;
    authServer ?: typeof utils.defaultAuthServerMaster;
}

export interface MonitorConsoleServiceOpts {
    type?: string;
    id?: string;
    host?: string;
    info?: ServerInfo;
    port?: number;
    env?: string;
    authServer ?: typeof utils.defaultAuthServerMaster;
}

export type ConsoleServiceOpts = MasterConsoleServiceOpts | MonitorConsoleServiceOpts;

export interface AdminLogInfo {
    action: string;
    moduleId: string;
    method?: string;
    msg: any;
    error?: Error | string | number;
}

/**
 * ConsoleService Constructor
 *
 * @class ConsoleService
 * @constructor
 * @param {Object} opts construct parameter
 *                 opts.type     {String} server type, 'master', 'connector', etc.
 *                 opts.id         {String} server id
 *                 opts.host     {String} (monitor only) master server host
 *                 opts.port     {String | Number} listen port for master or master port for monitor
 *                 opts.master  {Boolean} current service is master or monitor
 *                 opts.info     {Object} more server info for current server, {id, serverType, host, port}
 * @api public
 */
export class ConsoleService extends EventEmitter {
    port: number;
    env: string;
    values: {[key: string]: any};
    master: boolean;
    modules: {[key: string]: ModuleRecord};
    commands: {[key: string]: (consoleService: ConsoleService, moduleId: string, msg: any, cb: Callback) => void};
    authUser: typeof utils.defaultAuthUser;
    authServer: typeof utils.defaultAuthServerMonitor;
    agent: MasterAgent | MonitorAgent;

    id: string;
    host: string;
    type: string;

    constructor(_opts: ConsoleServiceOpts) {
        super();
        this.port = _opts.port;
        this.env = _opts.env;
        this.values = {};
        let masterOpts = _opts as MasterConsoleServiceOpts;
        let monitorOpts = _opts as MonitorConsoleServiceOpts;
        this.master = masterOpts.master;

        this.modules = {};
        this.commands = {
            'list': listCommand,
            'enable': enableCommand,
            'disable': disableCommand
        };

        if (this.master) {
            this.authUser = masterOpts.authUser || utils.defaultAuthUser;
            this.authServer = masterOpts.authServer || utils.defaultAuthServerMaster;
            this.agent = new MasterAgent(this, masterOpts);
        } else {
            this.type = monitorOpts.type;
            this.id = monitorOpts.id;
            this.host = monitorOpts.host;
            this.authServer = monitorOpts.authServer || utils.defaultAuthServerMonitor;
            this.agent = new MonitorAgent({
                consoleService: this,
                id: this.id,
                type: this.type,
                info: monitorOpts.info
            });
        }
    }


    /**
     * start master or monitor
     *
     * @param {Function} cb callback function
     * @api public
     */
    start(cb: (err?: Error) => void) {
        if (this.master) {
            let self = this;
            (this.agent as MasterAgent).listen(this.port, function (err) {
                if (!!err) {
                    utils.invokeCallback(cb, err);
                    return;
                }

                exportEvent(self, self.agent, 'register');
                exportEvent(self, self.agent, 'disconnect');
                exportEvent(self, self.agent, 'reconnect');
                process.nextTick(function () {
                    utils.invokeCallback(cb);
                });
            });
        } else {
            logger.info('try to connect master: %j, %j, %j', this.type, this.host, this.port);
            (this.agent as MonitorAgent).connect(this.port, this.host, cb);
            exportEvent(this, this.agent, 'close');
        }

        exportEvent(this, this.agent, 'error');

        for (let mid in this.modules) {
            this.enable(mid);
        }
    }

    /**
     * stop console modules and stop master server
     *
     * @api public
     */
    stop() {
        for (let mid in this.modules) {
            this.disable(mid);
        }
        this.agent.close();
    }

    /**
     * register a new adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @param {Object} module module object
     * @api public
     */
    register(moduleId: string, module: IModule) {
        this.modules[moduleId] = registerRecord(this, moduleId, module);
    }

    /**
     * enable adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    enable(moduleId: string) {
        let record = this.modules[moduleId];
        if (record && !record.enable) {
            record.enable = true;
            addToSchedule(this, record);
            return true;
        }
        return false;
    }

    /**
     * disable adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    disable(moduleId: string) {
        let record = this.modules[moduleId];
        if (record && record.enable) {
            record.enable = false;
            if (record.schedule && record.jobId) {
                schedule.cancelJob(record.jobId);
                record.jobId = null;
            }
            return true;
        }
        return false;
    }

    /**
     * call concrete module and handler(monitorHandler,masterHandler,clientHandler)
     *
     * @param {String} moduleId adminConsole id/name
     * @param {String} method handler
     * @param {Object} msg message
     * @param {Function} cb callback function
     * @api public
     */
    execute(moduleId: string, method: string, msg: any, cb: (err ?: Error|string , msg?: any) => void) {
        let self = this;
        let m = this.modules[moduleId];
        if (!m) {
            logger.error('unknown module: %j.', moduleId);
            cb('unknown moduleId:' + moduleId);
            return;
        }

        if (!m.enable) {
            logger.error('module %j is disable.', moduleId);
            cb('module ' + moduleId + ' is disable');
            return;
        }

        let module = m.module;
        if (!module || typeof module[method] !== 'function') {
            logger.error('module %j dose not have a method called %j.', moduleId, method);
            cb('module ' + moduleId + ' dose not have a method called ' + method);
            return;
        }

        let log: AdminLogInfo = {
            action: 'execute',
            moduleId: moduleId,
            method: method,
            msg: msg
        };

        let aclMsg = aclControl(self.agent as MasterAgent, 'execute', method, moduleId, msg);
        if (aclMsg !== 0 && aclMsg !== 1) {
            log['error'] = aclMsg;
            self.emit('admin-log', log, aclMsg);
            cb(new Error(aclMsg.toString()), null);
            return;
        }

        if (method === 'clientHandler') {
            self.emit('admin-log', log);
        }

        module[method](this.agent, msg, cb);
    }

    command(command: string, moduleId: string, msg: any, cb: (err ?: Error|string , msg?: any) => void) {
        let self = this;
        let fun = this.commands[command];
        if (!fun || typeof fun !== 'function') {
            cb('unknown command:' + command);
            return;
        }

        let log: AdminLogInfo = {
            action: 'command',
            moduleId: moduleId,
            msg: msg
        };

        let aclMsg = aclControl(self.agent as MasterAgent, 'command', null, moduleId, msg);
        if (aclMsg !== 0 && aclMsg !== 1) {
            log['error'] = aclMsg;
            self.emit('admin-log', log, aclMsg);
            cb(new Error(aclMsg.toString()), null);
            return;
        }

        self.emit('admin-log', log);
        fun(this, moduleId, msg, cb);
    }

    /**
     * set module data to a map
     *
     * @param {String} moduleId adminConsole id/name
     * @param {Object} value module data
     * @api public
     */

    set(moduleId: string, value: any) {
        this.values[moduleId] = value;
    }

    /**
     * get module data from map
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    get(moduleId: string) {
        return this.values[moduleId];
    }
}
/**
 * register a module service
 *
 * @param {Object} service consoleService object
 * @param {String} moduleId adminConsole id/name
 * @param {Object} module module object
 * @api private
 */
let registerRecord = function (service: ConsoleService, moduleId: string, module: IModule) {
    let record: any = {
        moduleId: moduleId,
        module: module,
        enable: false
    };

    if (module.type && module.interval) {
        if (!service.master && record.module.type === 'push' || service.master && record.module.type !== 'push') {
            // push for monitor or pull for master(default)
            record.delay = module.delay || 0;
            record.interval = module.interval || 1;
            // normalize the arguments
            if (record.delay < 0) {
                record.delay = 0;
            }
            if (record.interval < 0) {
                record.interval = 1;
            }
            record.interval = Math.ceil(record.interval);
            record.delay *= MS_OF_SECOND;
            record.interval *= MS_OF_SECOND;
            record.schedule = true;
        }
    }

    return record;
};

/**
 * schedule console module
 *
 * @param {Object} service consoleService object
 * @param {Object} record  module object
 * @api private
 */
let addToSchedule = function (service: ConsoleService, record: ModuleRecord) {
    if (record && record.schedule) {
        record.jobId = schedule.scheduleJob({
            start: Date.now() + record.delay,
            period: record.interval
        },
            doScheduleJob, {
                service: service,
                record: record
            });
    }
};

/**
 * run schedule job
 *
 * @param {Object} args argments
 * @api private
 */
let doScheduleJob = function (args: {service: ConsoleService , record: ModuleRecord}) {
    let service: ConsoleService = args.service;
    let record = args.record;
    if (!service || !record || !record.module || !record.enable) {
        return;
    }

    if (service.master) {
        record.module.masterHandler(service.agent as MasterAgent, null, function (err: Error) {
            logger.error('interval push should not have a callback.');
        });
    } else {
        record.module.monitorHandler(service.agent as MonitorAgent, null, function (err: Error) {
            logger.error('interval push should not have a callback.');
        });
    }
};

/**
 * export closure function out
 *
 * @param {Function} outer outer function
 * @param {Function} inner inner function
 * @param {object} event
 * @api private
 */
let exportEvent = function (outer: ConsoleService, inner: MasterAgent | MonitorAgent, event: string) {
    inner.on(event, function () {
        let args = Array.prototype.slice.call(arguments, 0);
        args.unshift(event);
        outer.emit.apply(outer, args);
    });
};

/**
 * List current modules
 */
let listCommand = function (consoleService: ConsoleService, moduleId: string, msg: any, cb: Callback) {
    let modules = consoleService.modules;

    let result = [];
    for (let moduleId in modules) {
        if (/^__\w+__$/.test(moduleId)) {
            continue;
        }

        result.push(moduleId);
    }

    cb(null, {
        modules: result
    });
};

/**
 * enable module in current server
 */
let enableCommand = function (consoleService: ConsoleService, moduleId: string, msg: any, cb: Callback) {
    if (!moduleId) {
        logger.error('fail to enable admin module for ' + moduleId);
        cb('empty moduleId');
        return;
    }

    let modules = consoleService.modules;
    if (!modules[moduleId]) {
        cb(null, protocol.PRO_FAIL);
        return;
    }

    if (consoleService.master) {
        consoleService.enable(moduleId);
        (consoleService.agent as MasterAgent).notifyCommand('enable', moduleId, msg);
        cb(null, protocol.PRO_OK);
    } else {
        consoleService.enable(moduleId);
        cb(null, protocol.PRO_OK);
    }
};

/**
 * disable module in current server
 */
let disableCommand = function (consoleService: ConsoleService, moduleId: string, msg: any, cb: Callback) {
    if (!moduleId) {
        logger.error('fail to enable admin module for ' + moduleId);
        cb('empty moduleId');
        return;
    }

    let modules = consoleService.modules;
    if (!modules[moduleId]) {
        cb(null, protocol.PRO_FAIL);
        return;
    }

    if (consoleService.master) {
        consoleService.disable(moduleId);
        (consoleService.agent as MasterAgent).notifyCommand('disable', moduleId, msg);
        cb(null, protocol.PRO_OK);
    } else {
        consoleService.disable(moduleId);
        cb(null, protocol.PRO_OK);
    }
};

let aclControl = function (agent: MasterAgent, action: string, method: string, moduleId: string, msg: any) {
    if (action === 'execute') {
        if (method !== 'clientHandler' || moduleId !== '__console__') {
            return 0;
        }

        let signal = msg.signal;
        if (!signal || !(signal === 'stop' || signal === 'add' || signal === 'kill')) {
            return 0;
        }
    }

    let clientId = msg.clientId;
    if (!clientId) {
        return 'Unknow clientId';
    }

    let _client = agent.getClientById(clientId);
    if (_client && _client.info && (_client.info as AdminUserInfo).level) {
        let level = (_client.info as AdminUserInfo).level;
        if (level > 1) {
            return 'Command permission denied';
        }
    } else {
        return 'Client info error';
    }
    return 1;
};

/**
 * Create master ConsoleService
 *
 * @param {Object} opts construct parameter
 *                      opts.port {String | Number} listen port for master console
 */
export function createMasterConsole(opts: ConsoleServiceOpts) {
    (opts as MasterConsoleServiceOpts).master = true;
    return new ConsoleService(opts);
}

/**
 * Create monitor ConsoleService
 *
 * @param {Object} opts construct parameter
 *                      opts.type {String} server type, 'master', 'connector', etc.
 *                      opts.id {String} server id
 *                      opts.host {String} master server host
 *                      opts.port {String | Number} master port
 */
export function createMonitorConsole(opts: ConsoleServiceOpts) {
    return new ConsoleService(opts);
}