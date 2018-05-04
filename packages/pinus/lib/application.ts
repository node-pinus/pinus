/*!
 * Pinus -- proto
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
import * as utils from './util/utils';
import { getLogger, ILogger } from 'pinus-logger';
import { EventEmitter } from 'events';
import { default as events, AppEvents } from './util/events';
import * as appUtil from './util/appUtil';
import * as Constants from './util/constants';
import * as appManager from './common/manager/appManager';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { IComponent } from './interfaces/IComponent';
import { DictionaryComponent } from './components/dictionary';
import { PushSchedulerComponent } from './components/pushScheduler';
import { BackendSessionService } from './common/service/backendSessionService';
import { ChannelService, ChannelServiceOptions } from './common/service/channelService';
import { SessionComponent } from './components/session';
import { ServerComponent } from './components/server';
import { RemoteComponent } from './components/remote';
import { ProxyComponent, RouteMaps, RouteFunction } from './components/proxy';
import { ProtobufComponent } from './components/protobuf';
import { MonitorComponent } from './components/monitor';
import { MasterComponent } from './components/master';
import { ConnectorComponent } from './components/connector';
import { ConnectionComponent } from './components/connection';
import { SessionService } from './common/service/sessionService';
import { ObjectType } from './interfaces/define';
import { isFunction } from 'util';
import { IModule, IModuleFactory } from 'pinus-admin';
import { ChannelComponent } from './components/channel';
import { BackendSessionComponent } from './components/backendSession';
import { ServerInfo, FRONTENDID } from './util/constants';
import { BeforeHandlerFilter, AfterHandlerFilter, IHandlerFilter } from './interfaces/IHandlerFilter';
import { TransactionCondictionFunction, TransactionHandlerFunction } from './common/manager/appManager';
import { RpcFilter, MailStationErrorHandler, RpcMsg } from 'pinus-rpc';
import { ILifeCycle } from './interfaces/ILifeCycle';
import { ModuleRecord } from './util/moduleUtil';
import { IPlugin, ApplicationEventContructor } from './interfaces/IPlugin';
import { Cron } from './server/server';
import { ServerStartArgs } from './util/appUtil';
import { RemoterProxyWithRoute, RemoterProxy } from './util/remoterHelper';
import { listEs6ClassMethods } from 'pinus-rpc';
import { ResponseErrorHandler } from './server/server';
import { FrontendOrBackendSession, ScheduleOptions, UID, SID, FrontendSession, ISession } from './index';
let logger = getLogger('pinus', path.basename(__filename));


export type ConfigureCallback =  () => void;
export type AConfigureFunc1 = () => Promise<void> ;
export type AConfigureFunc2 = (env: string) => Promise<void> ;
export type AConfigureFunc3 = (env: string, type: string) => Promise<void>;

export interface ApplicationOptions {
    base ?: string;
}

export type BeforeStopHookFunction = (app: Application, shutDown: () => void, cancelShutDownTimer: () => void) => void;

declare global {
    // 定义用户Rpc基础类
    interface UserRpc {
        test(): void;
    }

    // channelRemote functions
    type pushMessageFunction = (route: string, msg: any, uids: UID[], opts: ScheduleOptions) => Promise<UID[]>;
    type broadcastFunction = (route: string, msg: any, opts: ScheduleOptions) => Promise<UID[]>;
    // sessionRemote functions
    type bindFunction = (sid: SID, uid: UID) => Promise<void>;
    type unbindFunction = (sid: SID, uid: UID) => Promise<void>;
    type pushFunction = (sid: SID, key: string, value: any) => Promise<void>;
    type pushAllFunction = (sid: SID, settings: { [key: string]: any }) => Promise<void>;
    type getBackendSessionBySidFunction = (sid: SID) => Promise<ISession>;
    type getBackendSessionsByUidFunction = (uid: UID) => Promise<ISession[]>;
    type kickBySidFunction = (sid: SID, reason: string) => Promise<void>;
    type kickByUidFunction = (uid: UID, reason: string) => Promise<void>;

    interface SysRpc {
        [serverType: string]: {
            /**
             * 用来把客户端发到前端的handler信息转发到后端服务器
             */
            msgRemote: {
                forwardMessage: (routeParam: FrontendOrBackendSession, msg: any, session: ISession) => Promise<void>;
            },

            /**
             * 用来通知前端服务器往客户端发信息
             */
            channelRemote: {
                pushMessage: RemoterProxy<pushMessageFunction>;
                broadcast: RemoterProxy<broadcastFunction>;
            }

            /**
             * 用来从前端服务器获取或设置Session相关的服务
             */
            sessionRemote: {
                bind: RemoterProxy<bindFunction>;
                unbind: RemoterProxy<unbindFunction>;
                push: RemoterProxy<pushFunction>;
                pushAll: RemoterProxy<pushAllFunction>;
                getBackendSessionBySid: RemoterProxy<getBackendSessionBySidFunction>;
                getBackendSessionsByUid: RemoterProxy<getBackendSessionsByUidFunction>;
                kickBySid: RemoterProxy<kickBySidFunction>;
                kickByUid: RemoterProxy<kickByUidFunction>;
            }
        };
    }
}
/**
 * Application states
 */
let STATE_INITED = 1;  // app has inited
let STATE_BEFORE_START = 2;  // app before start
let STATE_START = 3;  // app start
let STATE_STARTED = 4;  // app has started
let STATE_STOPED = 5;  // app has stoped

export class Application {

    loaded: IComponent[] = [];       // loaded component list
    components: {
        __backendSession__ ?: BackendSessionComponent,
        __channel__ ?: ChannelComponent,
        __connection__ ?: ConnectionComponent,
        __connector__ ?: ConnectorComponent,
        __dictionary__ ?: DictionaryComponent,
        __master__ ?: MasterComponent,
        __monitor__ ?: MonitorComponent,
        __protobuf__ ?: ProtobufComponent,
        __proxy__ ?: ProxyComponent,
        __remote__ ?: RemoteComponent,
        __server__ ?: ServerComponent,
        __session__ ?: SessionComponent,
        __pushScheduler__ ?: PushSchedulerComponent,
        [key: string]: IComponent
    } = {};   // name -> component map

    sessionService ?: SessionService;
    backendSessionService ?: BackendSessionService;
    channelService ?: ChannelService;

    settings: {[key: string]: any} = {};     // collection keep set/get
    event = new EventEmitter();  // event object to sub/pub events

    // current server info
    serverId: string;   // current server id
    serverType: string; // current server type
    curServer: ServerInfo;  // current server info
    startTime: number; // current server start time

    // global server infos
    master: ServerStartArgs = null;         // master server info
    servers: {[id: string]: ServerInfo} = {};          // current global server info maps, id -> info
    serverTypeMaps: {[type: string]: ServerInfo[]}  = {};   // current global type maps, type -> [info]
    serverTypes: string[] = [];      // current global server type list
    usedPlugins: IPlugin[] = [];     // current server custom lifecycle callbacks
    clusterSeq: {[serverType: string]: number} = {};       // cluster id seqence
    state: number;
    base: string;

    startId: string;
    type: string;
    stopTimer: any;

    /**
     * Initialize the server.
     *
     *   - setup default configuration
     */
    init(opts ?: ApplicationOptions) {
        opts = opts || {};
        let base = opts.base || process.cwd();
        this.set(Constants.RESERVED.BASE, base);
        this.base = base;

        appUtil.defaultConfiguration(this);

        this.state = STATE_INITED;
        logger.info('application inited: %j', this.getServerId());
    }

    /**
     * Get application base path
     *
     *  // cwd: /home/game/
     *  pinus start
     *  // app.getBase() -> /home/game
     *
     * @return {String} application base path
     *
     * @memberOf Application
     */
    getBase() {
        return this.get(Constants.RESERVED.BASE);
    }

    /**
     * Override require method in application
     *
     * @param {String} relative path of file
     *
     * @memberOf Application
     */
    require(ph: string) {
        return require(path.join(this.getBase(), ph));
    }

    /**
     * Configure logger with {$base}/config/log4js.json
     *
     * @param {Object} logger pinus-logger instance without configuration
     *
     * @memberOf Application
     */
    configureLogger(logger: ILogger) {
        if (process.env.POMELO_LOGGER !== 'off') {
            let serverId = this.getServerId();
            let base = this.getBase();
            let env = this.get(Constants.RESERVED.ENV);
            let originPath = path.join(base, Constants.FILEPATH.LOG);
            let presentPath = path.join(base, Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
            if (fs.existsSync(originPath)) {
                logger.configure(originPath, {serverId: serverId, base: base});
            } else if (fs.existsSync(presentPath)) {
                logger.configure(presentPath, {serverId: serverId, base: base});
            } else {
                console.error('logger file path configuration is error.');
            }
        }
    }

    /**
     * add a filter to before and after filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    filter(filter: IHandlerFilter): void {
        this.before(filter);
        this.after(filter);
    }

    /**
     * Add before filter.
     *
     * @param {Object|Function} bf before fileter, bf(msg, session, next)
     * @memberOf Application
     */
    before(bf: BeforeHandlerFilter): void {
        addFilter(this, Constants.KEYWORDS.BEFORE_FILTER, bf);
    }

    /**
     * Add after filter.
     *
     * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
     * @memberOf Application
     */
    after(af: AfterHandlerFilter): void {
        addFilter(this, Constants.KEYWORDS.AFTER_FILTER, af);
    }

    /**
     * add a global filter to before and after global filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    globalFilter(filter: IHandlerFilter) {
        this.globalBefore(filter);
        this.globalAfter(filter);
    }

    /**
     * Add global before filter.
     *
     * @param {Object|Function} bf before fileter, bf(msg, session, next)
     * @memberOf Application
     */
    globalBefore(bf: BeforeHandlerFilter) {
        addFilter(this, Constants.KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
    }

    /**
     * Add global after filter.
     *
     * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
     * @memberOf Application
     */
    globalAfter(af: AfterHandlerFilter) {
        addFilter(this, Constants.KEYWORDS.GLOBAL_AFTER_FILTER, af);
    }

    /**
     * Add rpc before filter.
     *
     * @param {Object|Function} bf before fileter, bf(serverId, msg, opts, next)
     * @memberOf Application
     */
    rpcBefore(bf: RpcFilter | RpcFilter[]) {
        addFilter(this, Constants.KEYWORDS.RPC_BEFORE_FILTER, bf);
    }

    /**
     * Add rpc after filter.
     *
     * @param {Object|Function} af after filter, `af(serverId, msg, opts, next)`
     * @memberOf Application
     */
    rpcAfter(af: RpcFilter | RpcFilter[]) {
        addFilter(this, Constants.KEYWORDS.RPC_AFTER_FILTER, af);
    }

    /**
     * add a rpc filter to before and after rpc filter
     *
     * @param {Object} filter provide before and after filter method.
     *                        A filter should have two methods: before and after.
     * @memberOf Application
     */
    rpcFilter(filter: RpcFilter) {
        this.rpcBefore(filter);
        this.rpcAfter(filter);
    }

    /**
     * Load component
     *
     * @param  {String} name    (optional) name of the component
     * @param  {Object} component component instance or factory function of the component
     * @param  {[type]} opts    (optional) construct parameters for the factory function
     * @return {Object}     app instance for chain invoke
     * @memberOf Application
     */
    load<T extends IComponent>(component: ObjectType<T>, opts ?: any): T;
    load<T extends IComponent>(name: string, component: ObjectType<T>, opts ?: any): T;

    load<T extends IComponent>(component: T, opts ?: any): T;
    load<T extends IComponent>(name: string, component: T, opts ?: any): T;

    load<T extends IComponent>(name: string | ObjectType<T>, component ?: ObjectType<T> | any | T, opts ?: any): T {
        if (typeof name !== 'string') {
            opts = component;
            component = name;
            name = null;
        }

        if(isFunction(component)) {
            component = new component(this, opts);
        }

        if (!name && typeof component.name === 'string') {
            name = component.name;
        }

        if (name && this.components[name as string]) {
            // ignore duplicat component
            logger.warn('ignore duplicate component: %j', name);
            return;
        }

        this.loaded.push(component);
        if (name) {
            // components with a name would get by name throught app.components later.
            this.components[name as string] = component;
        }

        return component;
    }

    /**
     * Load Configure json file to settings.(support different enviroment directory & compatible for old path)
     *
     * @param {String} key environment key
     * @param {String} val environment value
     * @param {Boolean} reload whether reload after change default false
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    loadConfigBaseApp(key: string, val: string, reload = false) {
        let self = this;
        let env = this.get(Constants.RESERVED.ENV);
        let originPath = path.join(this.getBase(), val);
        let presentPath = path.join(this.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(val));
        let realPath: string;
        if (fs.existsSync(originPath)) {
            realPath = originPath;
            let file = require(originPath);
            if (file[env]) {
                file = file[env];
            }
            this.set(key, file);
        } else if (fs.existsSync(presentPath)) {
            realPath = presentPath;
            let pfile = require(presentPath);
            this.set(key, pfile);
        } else {
            logger.error('invalid configuration with file path: %s', key);
        }

        if (!!realPath && !!reload) {
            fs.watch(realPath, function (event, filename) {
                if (event === 'change') {
                    delete require.cache[require.resolve(realPath)];
                    self.loadConfigBaseApp(key, val);
                }
            });
        }
    }

    /**
     * Load Configure json file to settings.
     *
     * @param {String} key environment key
     * @param {String} val environment value
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    loadConfig(key: string, val: string) {
        let env = this.get(Constants.RESERVED.ENV);
        let cfg = require(val);
        if (cfg[env]) {
            cfg = cfg[env];
        }
        this.set(key, cfg);
    }

    /**
     * Set the route function for the specified server type.
     *
     * Examples:
     *
     *  app.route('area', routeFunc);
     *
     *  let routeFunc = function(session, msg, app, cb) {
     *    // all request to area would be route to the first area server
     *    let areas = app.getServersByType('area');
     *    cb(null, areas[0].id);
     *  };
     *
     * @param  {String} serverType server type string
     * @param  {Function} routeFunc  route function. routeFunc(session, msg, app, cb)
     * @return {Object}     current application instance for chain invoking
     * @memberOf Application
     */
    route(serverType: string, routeFunc: RouteFunction) {
        let routes = this.get(Constants.KEYWORDS.ROUTE);
        if (!routes) {
            routes = {};
            this.set(Constants.KEYWORDS.ROUTE, routes);
        }
        routes[serverType] = routeFunc;
        return this;
    }

    /**
     * Set before stop function. It would perform before servers stop.
     *
     * @param  {Function} fun before close function
     * @return {Void}
     * @memberOf Application
     */
    beforeStopHook(fun: BeforeStopHookFunction) {
        logger.warn('this method was deprecated in pinus 0.8');
        if (!!fun && typeof fun === 'function') {
            this.set(Constants.KEYWORDS.BEFORE_STOP_HOOK, fun);
        }
    }

    /**
     * Start application. It would load the default components and start all the loaded components.
     *
     * @param  {Function} cb callback function
     * @memberOf Application
     */
    start(cb ?: (err ?: Error , result ?: void) => void) {
        this.startTime = Date.now();
        if (this.state > STATE_INITED) {
            utils.invokeCallback(cb, new Error('application has already start.'));
            return;
        }

        let self = this;
        appUtil.startByType(self, function () {
            appUtil.loadDefaultComponents(self);
            let startUp = function () {
                self.state = STATE_BEFORE_START;
                logger.info('%j enter before start...', self.getServerId());

                appUtil.optComponents(self.loaded, Constants.RESERVED.BEFORE_START, function (err) {
                    if (err) {
                        utils.invokeCallback(cb, err);
                    } else {
                        logger.info('%j enter after start...', self.getServerId());

                        appUtil.optComponents(self.loaded, Constants.RESERVED.START, function (err) {
                            self.state = STATE_START;
                            if (err) {
                                utils.invokeCallback(cb, err);
                            } else {
                                logger.info('%j enter after start...', self.getServerId());
                                self.afterStart(cb);
                            }
                        });
                    }
                });

            };

            appUtil.optLifecycles(self.usedPlugins, Constants.LIFECYCLE.BEFORE_STARTUP, self, function (err) {
                if (err) {
                    utils.invokeCallback(cb, err);
                } else {
                    startUp();
                }
            });
        });
    }

    /**
     * Lifecycle callback for after start.
     *
     * @param  {Function} cb callback function
     * @return {Void}
     */
    afterStart(cb ?: (err?: Error) => void) {
        if (this.state !== STATE_START) {
            utils.invokeCallback(cb, new Error('application is not running now.'));
            return;
        }

        let self = this;
        appUtil.optComponents(this.loaded, Constants.RESERVED.AFTER_START, function (err) {
            self.state = STATE_STARTED;
            let id = self.getServerId();
            if (!err) {
                logger.info('%j finish start', id);
            }
            appUtil.optLifecycles(self.usedPlugins, Constants.LIFECYCLE.AFTER_STARTUP, self, cb);
            let usedTime = Date.now() - self.startTime;
            logger.info('%j startup in %s ms', id, usedTime);
            self.event.emit(events.START_SERVER, id);
        });
    }

    /**
     * Stop components.
     *
     * @param  {Boolean} force whether stop the app immediately
     */
    stop(force: boolean) {
        if (this.state > STATE_STARTED) {
            logger.warn('[pinus application] application is not running now.');
            return;
        }
        this.state = STATE_STOPED;
        let self = this;

        this.stopTimer = setTimeout(function () {
            process.exit(0);
        }, Constants.TIME.TIME_WAIT_STOP);

        let cancelShutDownTimer = function () {
            if (!!self.stopTimer) {
                clearTimeout(self.stopTimer);
            }
        };
        let shutDown = function () {
            appUtil.stopComps(self.loaded, 0, force, function () {
                cancelShutDownTimer();
                if (force) {
                    process.exit(0);
                }
            });
        };
        let fun = this.get(Constants.KEYWORDS.BEFORE_STOP_HOOK);

        appUtil.optLifecycles(self.usedPlugins, Constants.LIFECYCLE.BEFORE_SHUTDOWN, self, function (err) {
            if (err) {
                console.error(`throw err when beforeShutdown ` , err.stack);
            } else {
                if (!!fun) {
                    utils.invokeCallback(fun, self, shutDown, cancelShutDownTimer);
                } else {
                    shutDown();
                }
            }
        }, cancelShutDownTimer);
    }

    /**
     * Assign `setting` to `val`, or return `setting`'s value.
     *
     * Example:
     *
     *  app.set('key1', 'value1');
     *  app.get('key1');  // 'value1'
     *  app.key1;         // undefined
     *
     *  app.set('key2', 'value2', true);
     *  app.get('key2');  // 'value2'
     *  app.key2;         // 'value2'
     *
     * @param {String} setting the setting of application
     * @param {String} val the setting's value
     * @param {Boolean} attach whether attach the settings to application
     * @return {Server|Mixed} for chaining, or the setting value
     * @memberOf Application
     */
    set(setting: 'channelService', val: ChannelService, attach?: boolean): Application;
    set(setting: 'sessionService', val: SessionService, attach?: boolean): Application;
    set(setting: 'channelConfig', val: ChannelServiceOptions, attach?: boolean): Application;
    set(setting: 'backendSessionService', val: BackendSessionComponent, attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.BEFORE_FILTER, val: BeforeHandlerFilter[], attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.AFTER_FILTER, val: AfterHandlerFilter[], attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.GLOBAL_BEFORE_FILTER, val: BeforeHandlerFilter[], attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.GLOBAL_AFTER_FILTER, val: AfterHandlerFilter[], attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.RPC_BEFORE_FILTER, val: RpcFilter | RpcFilter[], attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.RPC_AFTER_FILTER, val: RpcFilter | RpcFilter[], attach?: boolean): Application;
    set(setting: Constants.RESERVED.RPC_ERROR_HANDLER, val: MailStationErrorHandler, attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.ROUTE, val: RouteMaps, attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.BEFORE_STOP_HOOK, val: BeforeStopHookFunction, attach?: boolean): Application;
    set(setting: Constants.RESERVED.BASE, val: string, attach?: boolean): Application;
    set(setting: Constants.RESERVED.ENV, val: string, attach?: boolean): Application;
    set(setting: Constants.RESERVED.GLOBAL_ERROR_HANDLER, val: ResponseErrorHandler, attach?: boolean): Application;
    set(setting: Constants.RESERVED.ERROR_HANDLER, val: ResponseErrorHandler, attach?: boolean): Application;
    set(setting: Constants.KEYWORDS.MODULE, val: {[key: string]: ModuleRecord}, attach?: boolean): Application;
    set(setting: string, val: string | any, attach?: boolean): Application;
    set(setting: string, val: string | any, attach?: boolean): Application {
        this.settings[setting] = val;
        if(attach) {
            (this as any)[setting] = val;
        }
        return this;
    }

    /**
     * Get property from setting
     *
     * @param {String} setting application setting
     * @return {String} val
     * @memberOf Application
     */
    get(setting: 'channelService'): ChannelService;
    get(setting: 'sessionService'): SessionService;
    get(setting: 'channelConfig'): ChannelServiceOptions;
    get(setting: 'backendSessionService'): BackendSessionComponent;
    get(setting: Constants.KEYWORDS.BEFORE_FILTER): BeforeHandlerFilter[];
    get(setting: Constants.KEYWORDS.AFTER_FILTER): AfterHandlerFilter[];
    get(setting: Constants.KEYWORDS.GLOBAL_BEFORE_FILTER): BeforeHandlerFilter[];
    get(setting: Constants.KEYWORDS.GLOBAL_AFTER_FILTER): AfterHandlerFilter[];
    get(setting: Constants.KEYWORDS.RPC_BEFORE_FILTER): RpcFilter | RpcFilter[];
    get(setting: Constants.KEYWORDS.RPC_AFTER_FILTER): RpcFilter | RpcFilter[];
    get(setting: Constants.RESERVED.RPC_ERROR_HANDLER): MailStationErrorHandler;
    get(setting: Constants.KEYWORDS.ROUTE): RouteMaps;
    get(setting: Constants.KEYWORDS.BEFORE_STOP_HOOK): BeforeStopHookFunction;
    get(setting: Constants.RESERVED.BASE): string;
    get(setting: Constants.RESERVED.ENV): string;
    get(setting: Constants.RESERVED.GLOBAL_ERROR_HANDLER): ResponseErrorHandler;
    get(setting: Constants.RESERVED.ERROR_HANDLER): ResponseErrorHandler;
    get(setting: Constants.KEYWORDS.MODULE): {[key: string]: ModuleRecord};
    get(setting: string): string | any;
    get(setting: string): string | any {
        return this.settings[setting];
    }

    /**
     * Check if `setting` is enabled.
     *
     * @param {String} setting application setting
     * @return {Boolean}
     * @memberOf Application
     */
    enabled(setting: string) {
        return !!this.get(setting);
    }

    /**
     * Check if `setting` is disabled.
     *
     * @param {String} setting application setting
     * @return {Boolean}
     * @memberOf Application
     */
    disabled(setting: string) {
        return !this.get(setting);
    }

    /**
     * Enable `setting`.
     *
     * @param {String} setting application setting
     * @return {app} for chaining
     * @memberOf Application
     */
    enable(setting: string) {
        return this.set(setting, true);
    }

    /**
     * Disable `setting`.
     *
     * @param {String} setting application setting
     * @return {app} for chaining
     * @memberOf Application
     */
    disable(setting: string) {
        return this.set(setting, false);
    }

    /**
     * Configure callback for the specified env and server type.
     * When no env is specified that callback will
     * be invoked for all environments and when no type is specified
     * that callback will be invoked for all server types.
     *
     * Examples:
     *
     *  app.configure(function(){
     *    // executed for all envs and server types
     *  });
     *
     *  app.configure('development', function(){
     *    // executed development env
     *  });
     *
     *  app.configure('development', 'connector', function(){
     *    // executed for development env and connector server type
     *  });
     *
     * @param {String} env application environment
     * @param {Function} fn callback function
     * @param {String} type server type
     * @return {Application} for chaining
     * @memberOf Application
     */

    configure(fn: ConfigureCallback): Application;
    configure(env: string, fn: ConfigureCallback): Application;
    configure(env: string, type: string, fn: ConfigureCallback): Application;
    configure(env: string | ConfigureCallback, type ?: string | ConfigureCallback, fn ?: ConfigureCallback): Application {
        let args = [].slice.call(arguments);
        fn = args.pop();
        env = type = Constants.RESERVED.ALL;

        if (args.length > 0) {
            env = args[0];
        }
        if (args.length > 1) {
            type = args[1];
        }

        if (env === Constants.RESERVED.ALL || contains(this.settings.env, env as string)) {
            if (type === Constants.RESERVED.ALL || contains(this.settings.serverType, type as string)) {
                fn.call(this);
            }
        }
        return this;
    }

    /**
     * Register admin modules. Admin modules is the extends point of the monitor system.
     *
     * @param {String} module (optional) module id or provoided by module.moduleId
     * @param {Object} module module object or factory function for module
     * @param {Object} opts construct parameter for module
     * @memberOf Application
     */
    registerAdmin(module: IModule, opts ?: any): void;
    registerAdmin(moduleId: string, module ?: IModule, opts ?: any): void;


    registerAdmin(module: IModuleFactory, opts ?: any): void;
    registerAdmin(moduleId: string, module ?: IModuleFactory, opts ?: any): void;

    registerAdmin(moduleId: string | IModule | IModuleFactory, module ?: IModule | IModuleFactory, opts ?: any) {
        let modules = this.get(Constants.KEYWORDS.MODULE);
        if (!modules) {
            modules = {};
            this.set(Constants.KEYWORDS.MODULE, modules);
        }

        if (typeof moduleId !== 'string') {
            opts = module;
            module = moduleId;
            if (module) {
                moduleId = ((module as IModuleFactory).moduleId);
                if(!moduleId)
                    moduleId = (module as IModule).constructor.name;
            }
        }

        if (!moduleId) {
            return;
        }

        modules[moduleId as string] = {
            moduleId: moduleId as string,
            module: module,
            opts: opts
        };
    }

    /**
     * Use plugin.
     *
     * @param  {Object} plugin plugin instance
     * @param  {[type]} opts    (optional) construct parameters for the factory function
     * @memberOf Application
     */
    use(plugin: IPlugin, opts ?: any) {
        opts = opts || {};
        if (!plugin) {
            throw new Error(`pluin is null!]`);
        }
        if (this.usedPlugins.indexOf(plugin) >= 0) {
            throw new Error(`pluin[${plugin.name} was used already!]`);
        }

        if(plugin.components) {
            for(let componentCtor of plugin.components) {
                this.load(componentCtor, opts);
            }
        }
        if(plugin.events) {
            for(let eventCtor of plugin.events) {
                this.loadEvent(eventCtor, opts);
            }
        }

        this.usedPlugins.push(plugin);

        console.warn(`used Plugin : ${plugin.name}`);
    }

    /**
     * Application transaction. Transcation includes conditions and handlers, if conditions are satisfied, handlers would be executed.
     * And you can set retry times to execute handlers. The transaction log is in file logs/transaction.log.
     *
     * @param {String} name transaction name
     * @param {Object} conditions functions which are called before transaction
     * @param {Object} handlers functions which are called during transaction
     * @param {Number} retry retry times to execute handlers if conditions are successfully executed
     * @memberOf Application
     */
    transaction(name: string, conditions: { [key: string]: TransactionCondictionFunction }, handlers: { [key: string]: TransactionHandlerFunction }, retry?: number) {
        appManager.transaction(name, conditions, handlers, retry);
    }

    /**
     * Get master server info.
     *
     * @return {Object} master server info, {id, host, port}
     * @memberOf Application
     */
    getMaster() {
        return this.master;
    }

    /**
     * Get current server info.
     *
     * @return {Object} current server info, {id, serverType, host, port}
     * @memberOf Application
     */
    getCurServer() {
        return this.curServer;
    }

    /**
     * Get current server id.
     *
     * @return {String|Number} current server id from servers.json
     * @memberOf Application
     */
    getServerId() {
        return this.serverId;
    }

    /**
     * Get current server
     * @returns ServerInfo
     */
    getCurrentServer() {
        return this.curServer;
    }

    /**
     * Get current server type.
     *
     * @return {String|Number} current server type from servers.json
     * @memberOf Application
     */
    getServerType() {
        return this.serverType;
    }

    /**
     * Get all the current server infos.
     *
     * @return {Object} server info map, key: server id, value: server info
     * @memberOf Application
     */
    getServers() {
        return this.servers;
    }

    /**
     * Get all server infos from servers.json.
     *
     * @return {Object} server info map, key: server id, value: server info
     * @memberOf Application
     */
    getServersFromConfig() {
        return this.get(Constants.KEYWORDS.SERVER_MAP);
    }

    /**
     * Get all the server type.
     *
     * @return {Array} server type list
     * @memberOf Application
     */
    getServerTypes() {
        return this.serverTypes;
    }

    /**
     * Get server info by server id from current server cluster.
     *
     * @param  {String} serverId server id
     * @return {Object} server info or undefined
     * @memberOf Application
     */
    getServerById(serverId: string) {
        return this.servers[serverId];
    }

    /**
     * Get server info by server id from servers.json.
     *
     * @param  {String} serverId server id
     * @return {Object} server info or undefined
     * @memberOf Application
     */

    getServerFromConfig(serverId: string) {
        return this.get(Constants.KEYWORDS.SERVER_MAP)[serverId];
    }

    /**
     * Get server infos by server type.
     *
     * @param  {String} serverType server type
     * @return {Array}      server info list
     * @memberOf Application
     */
    getServersByType(serverType: string) {
        return this.serverTypeMaps[serverType];
    }

    /**
     * Check the server whether is a frontend server
     *
     * @param  {server}  server server info. it would check current server
     *            if server not specified
     * @return {Boolean}
     *
     * @memberOf Application
     */
    isFrontend(server ?: any) {
        server = server || this.getCurServer();
        return !!server && server.frontend === 'true';
    }

    /**
     * Check the server whether is a backend server
     *
     * @param  {server}  server server info. it would check current server
     *            if server not specified
     * @return {Boolean}
     * @memberOf Application
     */
    isBackend(server: ServerInfo) {
        server = server || this.getCurServer();
        return !!server && !server.frontend;
    }

    /**
     * Check whether current server is a master server
     *
     * @return {Boolean}
     * @memberOf Application
     */
    isMaster() {
        return this.serverType === Constants.RESERVED.MASTER;
    }

    /**
     * Add new server info to current application in runtime.
     *
     * @param {Array} servers new server info list
     * @memberOf Application
     */
    addServers(servers: ServerInfo[]) {
        if (!servers || !servers.length) {
            return;
        }

        let item: ServerInfo, slist: ServerInfo[];
        for (let i = 0, l = servers.length; i < l; i++) {
            item = servers[i];
            // update global server map
            this.servers[item.id] = item;

            // update global server type map
            slist = this.serverTypeMaps[item.serverType];
            if (!slist) {
                this.serverTypeMaps[item.serverType] = slist = [];
            }
            replaceServer(slist, item);

            // update global server type list
            if (this.serverTypes.indexOf(item.serverType) < 0) {
                this.serverTypes.push(item.serverType);
            }
        }
        this.event.emit(events.ADD_SERVERS, servers);
    }

    /**
     * Remove server info from current application at runtime.
     *
     * @param  {Array} ids server id list
     * @memberOf Application
     */
    removeServers(ids: string[]) {
        if (!ids || !ids.length) {
            return;
        }

        let id, item, slist;
        for (let i = 0, l = ids.length; i < l; i++) {
            id = ids[i];
            item = this.servers[id];
            if (!item) {
                continue;
            }
            // clean global server map
            delete this.servers[id];

            // clean global server type map
            slist = this.serverTypeMaps[item.serverType];
            removeServer(slist, id);
            // TODO: should remove the server type if the slist is empty?
        }
        this.event.emit(events.REMOVE_SERVERS, ids);
    }

    /**
     * Replace server info from current application at runtime.
     *
     * @param  {Object} server id map
     * @memberOf Application
     */
    replaceServers(servers: {[serverId: string]: ServerInfo}) {
        if (!servers) {
            return;
        }

        this.servers = servers;
        this.serverTypeMaps = {};
        this.serverTypes = [];
        let serverArray = [];
        for (let id in servers) {
            let server = servers[id];
            let serverType = server[Constants.RESERVED.SERVER_TYPE];
            let slist = this.serverTypeMaps[serverType];
            if (!slist) {
                this.serverTypeMaps[serverType] = slist = [];
            }
            this.serverTypeMaps[serverType].push(server);
            // update global server type list
            if (this.serverTypes.indexOf(serverType) < 0) {
                this.serverTypes.push(serverType);
            }
            serverArray.push(server);
        }
        this.event.emit(events.REPLACE_SERVERS, serverArray);
    }

    /**
     * Add crons from current application at runtime.
     *
     * @param  {Array} crons new crons would be added in application
     * @memberOf Application
     */
    addCrons(crons: Cron[]) {
        if (!crons || !crons.length) {
            logger.warn('crons is not defined.');
            return;
        }
        this.event.emit(events.ADD_CRONS, crons);
    }

    /**
     * Remove crons from current application at runtime.
     *
     * @param  {Array} crons old crons would be removed in application
     * @memberOf Application
     */
    removeCrons(crons: Cron[]) {
        if (!crons || !crons.length) {
            logger.warn('ids is not defined.');
            return;
        }
        this.event.emit(events.REMOVE_CRONS, crons);
    }

    astart = utils.promisify(this.start);
    aconfigure: AConfigureFunc1 | AConfigureFunc2 | AConfigureFunc3 = utils.promisify(this.configure) as any;

    rpc ?: UserRpc;
    sysrpc ?: SysRpc;

    /**
     * Proxy for rpc client rpcInvoke.
     *
     * @param {String}   serverId remote server id
     * @param {Object}   msg      rpc message: {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param {Function} cb      callback function
     */
    rpcInvoke ?: (serverId: FRONTENDID, msg: RpcMsg, cb: Function) => void;


    /**
     * 加载一个事件侦听
     * @param Event
     * @param opts
     */
    loadEvent(Event: ApplicationEventContructor, opts: any) {
        let eventInstance = new Event(opts);

        for(let evt in AppEvents) {
            let name = AppEvents[evt];
            let method = (eventInstance as any)[name];
            if(method) {
                this.event.on(name, method.bind(eventInstance));
            }
        }
    }

}
let replaceServer = function (slist: ServerInfo[], serverInfo: ServerInfo) {
    for (let i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === serverInfo.id) {
            slist[i] = serverInfo;
            return;
        }
    }
    slist.push(serverInfo);
};

let removeServer = function (slist: ServerInfo[], id: string) {
    if (!slist || !slist.length) {
        return;
    }

    for (let i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === id) {
            slist.splice(i, 1);
            return;
        }
    }
};

let contains = function (str: string, settings: string) {
    if (!settings) {
        return false;
    }

    let ts = settings.split('|');
    for (let i = 0, l = ts.length; i < l; i++) {
        if (str === ts[i]) {
            return true;
        }
    }
    return false;
};

let addFilter = function<T>(app: Application, type: string, filter: T) {
    let filters = app.get(type);
    if (!filters) {
        filters = [];
        app.set(type, filters);
    }
    filters.push(filter);
};
