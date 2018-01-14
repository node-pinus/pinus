/**
 * Implementation of server component.
 * Init and start server instance.
 */
import { getLogger } from 'pinus-logger';
import * as fs from 'fs';
import * as path from 'path';
import * as pathUtil from '../util/pathUtil';
import * as Loader from 'pinus-loader';
import * as utils from '../util/utils';
import * as schedule from 'pinus-scheduler';
import { default as events } from '../util/events';
import * as Constants from '../util/constants';
import { FilterService } from '../common/service/filterService';
import { HandlerService, HandlerServiceOptions, HandlerCallback } from '../common/service/handlerService';
import { Application } from '../application';
import { EventEmitter } from 'events';
import { RouteRecord } from '../util/constants';
import { FrontendSession, BackendSession } from '../index';
import { LoaderPathType } from 'pinus-loader';
let logger = getLogger('pinus', path.basename(__filename));


let ST_INITED = 0;    // server inited
let ST_STARTED = 1;   // server started
let ST_STOPED = 2;    // server stoped

export type ServerOptions = HandlerServiceOptions;

export type FrontendOrBackendSession = FrontendSession | BackendSession;

export type ResponseErrorHandler = (err: Error, msg: any, resp: any, session: FrontendOrBackendSession, cb: HandlerCallback) => void;

export interface Cron {
    time: string;
    action: string;
    id: string;
}

/**
 * Server factory function.
 *
 * @param {Object} app  current application context
 * @return {Object} erver instance
 */
export function create(app: Application, opts: ServerOptions) {
    return new Server(app, opts);
}

export class Server extends EventEmitter {
    app: Application;
    opts: ServerOptions;

    globalFilterService: FilterService = null;
    filterService: FilterService = null;
    handlerService: HandlerService = null;
    cronHandlers: {[handler: string]: {[method: string]: () => void}} = null;
    crons: Cron[] = [];
    jobs: {[cronId: string]: number} = {};
    state = ST_INITED;
    constructor(app: Application, opts?: ServerOptions) {
        super();
        this.opts = opts || {};
        this.app = app;

        app.event.on(events.ADD_CRONS, this.addCrons.bind(this));
        app.event.on(events.REMOVE_CRONS, this.removeCrons.bind(this));
    }


    /**
     * Server lifecycle callback
     */
    start() {
        if (this.state > ST_INITED) {
            return;
        }

        this.globalFilterService = initFilter(true, this.app);
        this.filterService = initFilter(false, this.app);
        this.handlerService = initHandler(this.app, this.opts);
        this.cronHandlers = loadCronHandlers(this.app);
        loadCrons(this, this.app);
        this.state = ST_STARTED;
    }

    afterStartAll() {
        scheduleCrons(this, this.crons);
    }

    /**
     * Stop server
     */
    stop() {
        this.state = ST_STOPED;
    }

    /**
     * Global handler.
     *
     * @param  {Object} msg request message
     * @param  {Object} session session object
     * @param  {Callback} callback function
     */
    globalHandle(msg: any, session: FrontendOrBackendSession, cb: HandlerCallback) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('server not started'));
            return;
        }

        let routeRecord = parseRoute(msg.route);
        if (!routeRecord) {
            utils.invokeCallback(cb, new Error(`meet unknown route message ${msg.route}`));
            return;
        }

        let self = this;
        let dispatch = function (err: Error, resp: any) {
            if (err) {
                handleError(true, self, err, msg, session, resp, function (err, resp) {
                    response(true, self, err, routeRecord, msg, session, resp, cb);
                });
                return;
            }

            if (self.app.getServerType() !== routeRecord.serverType) {
                doForward(self.app, msg, session, routeRecord, function (err, resp) {
                    response(true, self, err, routeRecord, msg, session, resp, cb);
                });
            } else {
                doHandle(self, msg, session, routeRecord, function (err, resp) {
                    response(true, self, err, routeRecord, msg, session, resp, cb);
                });
            }
        };
        beforeFilter(true, self, routeRecord, msg, session, dispatch);
    }

    /**
     * Handle request
     */
    handle(msg: any, session: FrontendOrBackendSession, cb: HandlerCallback) {
        if (this.state !== ST_STARTED) {
            cb(new Error('server not started'));
            return;
        }

        let routeRecord = parseRoute(msg.route);
        doHandle(this, msg, session, routeRecord, cb);
    }

    /**
     * Add crons at runtime.
     *
     * @param {Array} crons would be added in application
     */
    addCrons(crons: Cron[]) {
        this.cronHandlers = loadCronHandlers(this.app);
        for (let i = 0, l = crons.length; i < l; i++) {
            let cron = crons[i];
            checkAndAdd(cron, this.crons, this);
        }
        scheduleCrons(this, crons);
    }

    /**
     * Remove crons at runtime.
     *
     * @param {Array} crons would be removed in application
     */
    removeCrons(crons: Cron[]) {
        for (let i = 0, l = crons.length; i < l; i++) {
            let cron = crons[i];
            let id = parseInt(cron.id);
            if (!!this.jobs[id]) {
                schedule.cancelJob(this.jobs[id]);
            } else {
                logger.warn('cron is not in application: %j', cron);
            }
        }
    }
}

let initFilter = function (isGlobal: boolean, app: Application) {
    let service = new FilterService();
    let befores, afters;

    if (isGlobal) {
        befores = app.get(Constants.KEYWORDS.GLOBAL_BEFORE_FILTER);
        afters = app.get(Constants.KEYWORDS.GLOBAL_AFTER_FILTER);
    } else {
        befores = app.get(Constants.KEYWORDS.BEFORE_FILTER);
        afters = app.get(Constants.KEYWORDS.AFTER_FILTER);
    }

    let i, l;
    if (befores) {
        for (i = 0, l = befores.length; i < l; i++) {
            service.before(befores[i]);
        }
    }

    if (afters) {
        for (i = 0, l = afters.length; i < l; i++) {
            service.after(afters[i]);
        }
    }

    return service;
};

let initHandler = function (app: Application, opts: HandlerServiceOptions) {
    return new HandlerService(app, opts);
};

/**
 * Load cron handlers from current application
 */
let loadCronHandlers = function (app: Application) {
    let all: {[key: string]: any} = {};
    let p = pathUtil.getCronPath(app.getBase(), app.getServerType());
    if (p) {
        let crons = Loader.load(p, app, false, true, LoaderPathType.PINUS_CRONNER);
        for (let name in crons) {
            all[name] = crons[name];
        }
    }

    for (let plugin of app.usedPlugins) {
        if (plugin.cronPath) {
            if (!fs.existsSync(plugin.cronPath)) {
                logger.error(`插件[${plugin.name}的cronPath[${plugin.cronPath}不存在。]]`);
                continue;
            }
            let crons = Loader.load(plugin.cronPath, app, false, true, LoaderPathType.PINUS_CRONNER);
            for (let name in crons) {
                all[name] = crons[name];
            }
        }
    }
    return all;
};

/**
 * Load crons from configure file
 */
let loadCrons = function (server: Server, app: Application) {
    let env = app.get(Constants.RESERVED.ENV);
    let p = path.join(app.getBase(), Constants.FILEPATH.CRON);
    if (!fs.existsSync(p)) {
        p = path.join(app.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CRON));
        if (!fs.existsSync(p)) {
            return;
        }
    }
    app.loadConfigBaseApp(Constants.RESERVED.CRONS, Constants.FILEPATH.CRON);
    let crons = app.get(Constants.RESERVED.CRONS);
    for (let serverType in crons) {
        if (app.serverType === serverType) {
            let list = crons[serverType];
            for (let i = 0; i < list.length; i++) {
                if (!list[i].serverId) {
                    checkAndAdd(list[i], server.crons, server);
                } else {
                    if (app.serverId === list[i].serverId) {
                        checkAndAdd(list[i], server.crons, server);
                    }
                }
            }
        }
    }
};

/**
 * Fire before filter chain if any
 */
let beforeFilter = function (isGlobal: boolean, server: Server, routeRecord: RouteRecord, msg: any, session: FrontendOrBackendSession, cb: HandlerCallback) {
    let fm;
    if (isGlobal) {
        fm = server.globalFilterService;
    } else {
        fm = server.filterService;
    }
    if (fm) {
        fm.beforeFilter(routeRecord, msg, session, cb);
    } else {
        utils.invokeCallback(cb);
    }
};

/**
 * Fire after filter chain if have
 */
let afterFilter = function (isGlobal: boolean, server: Server, err: Error, routeRecord: RouteRecord, msg: any, session: FrontendOrBackendSession, resp: any, cb: HandlerCallback) {
    let fm;
    if (isGlobal) {
        fm = server.globalFilterService;
    } else {
        fm = server.filterService;
    }
    if (fm) {
        if (isGlobal) {
            fm.afterFilter(err, routeRecord, msg, session, resp, function () {
                // do nothing
            });
        } else {
            fm.afterFilter(err, routeRecord, msg, session, resp, function (err: Error) {
                cb(err, resp);
            });
        }
    }
};

/**
 * pass err to the global error handler if specified
 */
let handleError = function (isGlobal: boolean, server: Server, err: Error, msg: any, session: FrontendOrBackendSession, resp: any, cb: HandlerCallback) {
    let handler: ResponseErrorHandler;
    if (isGlobal) {
        handler = server.app.get(Constants.RESERVED.GLOBAL_ERROR_HANDLER);
    } else {
        handler = server.app.get(Constants.RESERVED.ERROR_HANDLER);
    }
    if (!handler) {
        logger.error(`${server.app.serverId} no default error handler msg[${JSON.stringify(msg)}] to resolve unknown exception: sessionId:${JSON.stringify(session.export())} , error stack: ${err.stack}`);
        utils.invokeCallback(cb, err, resp);
    } else {
        if (handler.length === 5) {
            handler(err, msg, resp, session, cb);
        } else {
            handler(err, msg, resp, session, cb);
        }
    }
};

/**
 * Send response to client and fire after filter chain if any.
 */

let response = function (isGlobal: boolean, server: Server, err: Error, routeRecord: RouteRecord, msg: any, session: FrontendOrBackendSession, resp: any, cb: HandlerCallback) {
    if (isGlobal) {
        cb(err, resp);
        // after filter should not interfere response
        afterFilter(isGlobal, server, err, routeRecord, msg, session, resp, cb);
    } else {
        afterFilter(isGlobal, server, err, routeRecord, msg, session, resp, cb);
    }
};

/**
 * Parse route string.
 *
 * @param  {String} route route string, such as: serverName.handlerName.methodName
 * @return {Object}       parse result object or null for illeagle route string
 */
let parseRoute = function (route: string): RouteRecord {
    if (!route) {
        return null;
    }
    let ts = route.split('.');
    if (ts.length !== 3) {
        return null;
    }

    return {
        route: route,
        serverType: ts[0],
        handler: ts[1],
        method: ts[2]
    };
};

let doForward = function (app: Application, msg: any, session: FrontendOrBackendSession, routeRecord: RouteRecord, cb: HandlerCallback) {
    let finished = false;
    // should route to other servers
    try {
        app.sysrpc[routeRecord.serverType].msgRemote.forwardMessage(
            // app.sysrpc[routeRecord.serverType].msgRemote.forwardMessage2(
            session,
            msg,
            // msg.oldRoute || msg.route,
            // msg.body,
            // msg.aesPassword,
            // msg.compressGzip,
            session.export()
        ).then(
            function (resp: any) {
                finished = true;
                utils.invokeCallback(cb, null, resp);
            }).catch(function (err: Error) {
                logger.error(app.serverId + ' fail to process remote message:' + err.stack);
                utils.invokeCallback(cb, err);
            });
    }
    catch (err) {
        if (!finished) {
            logger.error(app.serverId + ' fail to forward message:' + err.stack);
            utils.invokeCallback(cb, err);
        }
    }
};

let doHandle = function (server: Server, msg: any, session: FrontendOrBackendSession, routeRecord: RouteRecord, cb: HandlerCallback) {
    msg = msg.body || {};

    let self = server;

    let handle = function (err: Error, resp: any) {
        if (err) {
            // error from before filter
            handleError(false, self, err, msg, session, resp, function (err: Error, resp: any) {
                response(false, self, err, routeRecord, msg, session, resp, cb);
            });
            return;
        }

        self.handlerService.handle(routeRecord, msg, session, function (err: Error, resp: any) {
            if (err) {
                // error from handler
                handleError(false, self, err, msg, session, resp, function (err: Error, resp: any) {
                    response(false, self, err, routeRecord, msg, session, resp, cb);
                });
                return;
            }

            response(false, self, err, routeRecord, msg, session, resp, cb);
        });
    };  // end of handle

    beforeFilter(false, server, routeRecord, msg, session, handle);
};

/**
 * Schedule crons
 */
let scheduleCrons = function (server: Server, crons: Cron[]) {
    let handlers = server.cronHandlers;
    for (let i = 0; i < crons.length; i++) {
        let cronInfo = crons[i];
        let time = cronInfo.time;
        let action = cronInfo.action;
        let jobId = cronInfo.id;

        if (!time || !action || !jobId) {
            logger.error(server.app.serverId + ' cron miss necessary parameters: %j', cronInfo);
            continue;
        }

        if (action.indexOf('.') < 0) {
            logger.error(server.app.serverId + ' cron action is error format: %j', cronInfo);
            continue;
        }

        let cron = action.split('.')[0];
        let job = action.split('.')[1];
        let handler = handlers[cron];

        if (!handler) {
            logger.error('could not find cron: %j', cronInfo);
            continue;
        }

        if (typeof handler[job] !== 'function') {
            logger.error('could not find cron job: %j, %s', cronInfo, job);
            continue;
        }

        let id = schedule.scheduleJob(time, handler[job].bind(handler));
        server.jobs[jobId] = id;
    }
};

/**
 * If cron is not in crons then put it in the array.
 */
let checkAndAdd = function (cron: Cron, crons: Cron[], server: Server) {
    if (!containCron(cron.id, crons)) {
        server.crons.push(cron);
    } else {
        logger.warn('cron is duplicated: %j', cron);
    }
};

/**
 * Check if cron is in crons.
 */
let containCron = function (id: string, crons: Cron[]) {
    for (let i = 0, l = crons.length; i < l; i++) {
        if (id === crons[i].id) {
            return true;
        }
    }
    return false;
};
