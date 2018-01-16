import * as fs from 'fs';
import * as utils from '../../util/utils';
import * as Loader from 'pinus-loader';
import * as pathUtil from '../../util/pathUtil';
import { getLogger } from 'pinus-logger';
import { Application } from '../../application';
import { Session, FrontendSession } from './sessionService';
import { RouteRecord, ServerInfo } from '../../util/constants';
import { BackendSession } from './backendSessionService';
import * as path from 'path';
import { LoaderPathType } from 'pinus-loader';
let logger = getLogger('pinus', path.basename(__filename));
let forwardLogger = getLogger('forward-log', path.basename(__filename));

export interface HandlerServiceOptions {
    reloadHandlers ?: boolean;
    enableForwardLog ?: boolean;
    handlersPaths ?: string[];
}

export type HandlerCallback = (err: Error , response ?: any) => void;
export type HandlerMethod = (msg: any , session: FrontendSession | BackendSession) => Promise<any>;
export type Handler = {[method: string]: HandlerMethod};
export type Handlers = {[handler: string]: Handler};
export type HandlerMap = {[serverType: string]: Handlers};
/**
 * Handler service.
 * Dispatch request to the relactive handler.
 *
 * @param {Object} app      current application context
 */
export class HandlerService {
    app: Application;
    handlerMap: HandlerMap = {};
    handlerPaths: {[serverType: string]: Set<string>} = {};
    enableForwardLog: boolean;
    constructor(app: Application, opts: HandlerServiceOptions) {
        this.app = app;
        if (!!opts.reloadHandlers) {
            watchHandlers(app, this.handlerMap);
        }
        this.enableForwardLog = opts.enableForwardLog || false;

        // 添加默认路径到ServerInfo中
        let info = app.getCurrentServer();
        let handlerPath = info.serverType ? pathUtil.getHandlerPath(app.getBase(), info.serverType) : undefined;
        info.handlerPaths = [];
        if(handlerPath) {
            info.handlerPaths.push(handlerPath);
        }

        // 添加插件中的handler到ServerInfo中
        for(let plugin of app.usedPlugins) {
            if(plugin.handlerPath) {
                info.handlerPaths.push(plugin.handlerPath);
            }
        }

        // 添加一台服务器
        this.addServer(info);
    }


    name = 'handler';

    /**
     * Handler the request.
     */
    handle(routeRecord: RouteRecord, msg: any, session: FrontendSession | BackendSession, cb: HandlerCallback) {
        // the request should be processed by current server
        let handler = this.getHandler(routeRecord);
        if (!handler) {
            logger.error('[handleManager]: fail to find handler for %j', routeRecord.route);
            utils.invokeCallback(cb, new Error('fail to find handler for ' + routeRecord.route));
            return;
        }
        let start = Date.now();
        let self = this;

        let callback = function (err?: any, resp?: any, opts?: any) {
            if (self.enableForwardLog) {
                let log = {
                    route: routeRecord.route,
                    args: msg,
                    time: utils.format(new Date(start)),
                    timeUsed: Date.now() - start
                };
                forwardLogger.info(JSON.stringify(log));
            }

            // resp = getResp(arguments);
            utils.invokeCallback(cb, err, resp, opts);
        };

        let method = routeRecord.method;

        if (!Array.isArray(msg)) {
            handler[method](msg, session).then((resp) => {
                callback(null, resp);
            }, (reason) => {
                    callback(reason);
                });
        } else {
            msg.push(session);
            handler[method].apply(handler, msg).then((resp: any) => {
                callback(null, resp);
            }, (reason: any) => {

                    callback(reason);
                });
        }
        return;
    }

    /**
     * Get handler instance by routeRecord.
     *
     * @param  {Object} handlers    handler map
     * @param  {Object} routeRecord route record parsed from route string
     * @return {Object}             handler instance if any matchs or null for match fail
     */
    getHandler(routeRecord: RouteRecord) {
        let serverType = routeRecord.serverType;
        if (!this.handlerMap[serverType]) {
            this.loadHandlers(serverType);
        }
        let handlers = this.handlerMap[serverType] || {};
        let handler = handlers[routeRecord.handler];
        if (!handler) {
            logger.warn('could not find handler for routeRecord: %j', routeRecord);
            return null;
        }
        if (typeof handler[routeRecord.method] !== 'function') {
            logger.warn('could not find the method %s in handler: %s', routeRecord.method, routeRecord.handler);
            return null;
        }
        return handler;
    }

    private parseHandler(serverType: string , handlerPath: string) {
        let modules = Loader.load(handlerPath, this.app, false, true, LoaderPathType.PINUS_HANDLER) as Handlers;
        for(let name in modules) {
            let targetHandlers = this.handlerMap[serverType];
            if(!targetHandlers) {
                targetHandlers = {};
                this.handlerMap[serverType] = targetHandlers;
            }
            targetHandlers[name] = modules[name];
        }
    }

    private addServer(serverInfo: ServerInfo) {
        let targetPaths = this.handlerPaths[serverInfo.serverType];
        if(!targetPaths) {
            targetPaths = new Set<string>();
            this.handlerPaths[serverInfo.serverType] = targetPaths;
        }
        for(let path of serverInfo.handlerPaths) {
            targetPaths.add(path);
        }
    }

    /**
     * Load handlers from current application
     */
    private loadHandlers(serverType: string) {
        let paths = this.handlerPaths[serverType];
        for(let path of paths) {
            this.parseHandler(serverType , path);
        }
    }
}


let watchHandlers = function (app: Application, handlerMap: HandlerMap) {
    let p = pathUtil.getHandlerPath(app.getBase(), app.serverType);
    if (!!p) {
        fs.watch(p, function (event, name) {
            if (event === 'change') {
                handlerMap[app.serverType] = Loader.load(p, app, true, true, LoaderPathType.PINUS_HANDLER);
            }
        });
    }
};

let getResp = function (args: any) {
    let len = args.length;
    if (len === 1) {
        return [];
    }

    if (len === 2) {
        return [args[1]];
    }

    if (len === 3) {
        return [args[1], args[2]];
    }

    if (len === 4) {
        return [args[1], args[2], args[3]];
    }

    let r = new Array(len);
    for (let i = 1; i < len; i++) {
        r[i] = args[i];
    }

    return r;
};