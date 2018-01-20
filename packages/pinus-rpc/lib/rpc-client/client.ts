import { getLogger, Logger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'rpc-client');
import { failureProcess } from './failureProcess';
import { constants } from '../util/constants';
import * as Station from './mailstation';
import { Tracer } from '../util/tracer';
import * as Loader from 'pinus-loader';
import * as utils from '../util/utils';
import * as router from './router';
import * as async from 'async';
import { RpcServerInfo, MailStation, MailStationErrorHandler, RpcFilter, MailStationOpts } from './mailstation';
import {AsyncFunction, AsyncResultArrayCallback, ErrorCallback} from 'async';
import { ConsistentHash } from '../util/consistentHash';
import { RemoteServerCode } from '../../index';
import { listEs6ClassMethods } from '../util/utils';
import { LoaderPathType } from 'pinus-loader';
import {IMailBoxFactory} from './mailbox';

/**
 * Client states
 */
let STATE_INITED = 1; // client has inited
let STATE_STARTED = 2; // client has started
let STATE_CLOSED = 3; // client has closed

export type RouterFunction = (session: { [key: string]: any }, msg: RpcMsg, context: RouteContext, cb: (err: Error, serverId?: string) => void) => void;
export type Router = RouterFunction | { route: RouterFunction };

export type RouteServers = RpcServerInfo[];
export interface RouteContextClass {
    getServersByType?: (serverType: string) => RouteServers;
}

export type RouteContext = RouteServers | RouteContextClass;


export interface Proxy {
    // 根据路由参数决定发往哪台服务器，第一个是路由参数，其他是rpc参数
    (routeParam: any, ...args: any[]): Promise<any>;
    // 根据服务器id决定发往哪个服务器，serverId如果是*，则发往所有这个rpc所属类型的服务器
    toServer(serverId: string, ...args: any[]): Promise<any>;


    // 根据路由参数决定发往哪台服务器，typescript友好
    route(routeParam: any): (...args: any[]) => Promise<any>;
    // 默认传递null作为路由参数，typescript友好
    defaultRoute(...args: any[]): Promise<any>;
    // 根据服务器id决定发往哪个服务器，serverId如果是*，则发往所有这个rpc所属类型的服务器
    to(serverId: string): (...args: any[]) => Promise<any>;
    // 广播到所有这个rpc服务器的类型的服务器
    broadcast(...args: any[]): Promise<any>;
}

export type ProxyCallback = (routeParam: any, serviceName: string, methodName: string, args: any[], attach: RemoteServerCode, isToSpecifiedServer?: boolean) => Promise<any>;

export type Proxies = {
    [namespace: string]:
        {[serverType: string]:
                {[remoterName: string]:
                        {[attr: string]: Proxy}}}
};
export interface RpcClientOpts extends MailStationOpts {
    context?: any;
    routeContext?: RouteContext;
    router?: Router;
    routerType?: string;
    rpcDebugLog?: boolean;
    clientId?: string;
    servers?: { serverType: Array<RpcServerInfo> };
    rpcLogger?: Logger;
    station?: MailStation;
    hashFieldIndex?: number;
}

export interface RpcMsg {
    namespace: string;
    serverType?: string;
    service: string;
    method: string;
    args: any[];
}

export interface TargetRouterFunction {
    (serverType: string, msg: RpcMsg, routeParam: object, cb: (err: Error, serverId: string) => void): void;
}

/**
 * RPC Client Class
 */
export class RpcClient {
    _context: any;
    _routeContext: RouteContext;
    router: Router;
    routerType: string;
    rpcDebugLog: boolean;
    opts: RpcClientOpts;
    proxies: Proxies;
    _station: MailStation;
    state: number;

    targetRouterFunction: TargetRouterFunction;

    wrrParam?: { [serverType: string]: { index: number, weight: number } };
    chParam?: { [serverType: string]: { consistentHash: ConsistentHash } };

    constructor(opts?: RpcClientOpts) {
        opts = opts || {};
        this._context = opts.context;
        this._routeContext = opts.routeContext;
        this.router = opts.router || router.df;
        this.routerType = opts.routerType;
        this.rpcDebugLog = opts.rpcDebugLog;
        if (this._context) {
            opts.clientId = this._context.serverId;
        }
        this.opts = opts;
        this.proxies = {};
        this.targetRouterFunction = this.getRouteFunction();
        this._station = createStation(opts);
        this.state = STATE_INITED;
    }

    /**
     * Start the rpc client which would try to connect the remote servers and
     * report the result by cb.
     *
     * @param cb {Function} cb(err)
     */
    start(cb: (err?: Error) => void) {
        if (this.state > STATE_INITED) {
            cb(new Error('rpc client has started.'));
            return;
        }

        let self = this;
        this._station.start(function (err: Error) {
            if (err) {
                logger.error('[pinus-rpc] client start fail for ' + err.stack);
                return cb(err);
            }
            self._station.on('error', failureProcess.bind(self._station));
            self.state = STATE_STARTED;
            cb();
        });
    }

    /**
     * Stop the rpc client.
     *
     * @param  {Boolean} force
     * @return {Void}
     */
    stop(force: boolean) {
        if (this.state !== STATE_STARTED) {
            logger.warn('[pinus-rpc] client is not running now.');
            return;
        }
        this.state = STATE_CLOSED;
        this._station.stop(force);
    }

    /**
     * Add a new proxy to the rpc client which would overrid the proxy under the
     * same key.
     *
     * @param {Object} record proxy description record, format:
     *                        {namespace, serverType, path}
     */
    addProxy(record: RemoteServerCode) {
        if (!record) {
            return;
        }
        let proxy = this.generateProxy(record, this._context);
        if (!proxy) {
            return;
        }
        insertProxy(this.proxies, record.namespace, record.serverType, proxy);
    }

    /**
     * Batch version for addProxy.
     *
     * @param {Array} records list of proxy description record
     */
    addProxies(records: RemoteServerCode[]) {
        if (!records || !records.length) {
            return;
        }
        for (let i = 0, l = records.length; i < l; i++) {
            this.addProxy(records[i]);
        }
    }

    /**
     * Add new remote server to the rpc client.
     *
     * @param {Object} server new server information
     */
    addServer(server: RpcServerInfo) {
        this._station.addServer(server);
    }

    /**
     * Batch version for add new remote server.
     *
     * @param {Array} servers server info list
     */
    addServers(servers: RpcServerInfo[]) {
        this._station.addServers(servers);
    }

    /**
     * Remove remote server from the rpc client.
     *
     * @param  {String|Number} id server id
     */
    removeServer(id: string | number) {
        this._station.removeServer(id);
    }

    /**
     * Batch version for remove remote server.
     *
     * @param  {Array} ids remote server id list
     */
    removeServers(ids: Array<string | number>) {
        this._station.removeServers(ids);
    }

    /**
     * Replace remote servers.
     *
     * @param {Array} servers server info list
     */
    replaceServers(servers: RpcServerInfo[]) {
        this._station.replaceServers(servers);
    }

    /**
     * Do the rpc invoke directly.
     *
     * @param serverId {String} remote server id
     * @param msg {Object} rpc message. Message format:
     *    {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param cb {Function} cb(err, ...)
     */
    rpcInvoke(serverId: string, msg: RpcMsg, cb: (err: Error, ...args: any[]) => void) {
        let rpcDebugLog = this.rpcDebugLog;
        let tracer: Tracer;

        if (rpcDebugLog) {
            tracer = new Tracer(this.opts.rpcLogger, this.opts.rpcDebugLog, this.opts.clientId, serverId, msg);
            tracer.info('client', __filename, 'rpcInvoke', 'the entrance of rpc invoke');
        }

        if (this.state !== STATE_STARTED) {
            tracer && tracer.error('client', __filename, 'rpcInvoke', 'fail to do rpc invoke for client is not running');
            logger.error('[pinus-rpc] fail to do rpc invoke for client is not running');
            cb(new Error('[pinus-rpc] fail to do rpc invoke for client is not running'));
            return;
        }
        this._station.dispatch(tracer, serverId, msg, this.opts, cb);
    }

    /**
     * Add rpc before filter.
     *
     * @param filter {Function} rpc before filter function.
     *
     * @api public
     */
    before(filter: RpcFilter | RpcFilter[]) {
        this._station.before(filter);
    }

    /**
     * Add rpc after filter.
     *
     * @param filter {Function} rpc after filter function.
     *
     * @api public
     */
    after(filter: RpcFilter | RpcFilter[]) {
        this._station.after(filter);
    }

    /**
     * Add rpc filter.
     *
     * @param filter {Function} rpc filter function.
     *
     * @api public
     */
    filter(filter: RpcFilter) {
        this._station.filter(filter);
    }

    /**
     * Set rpc filter error handler.
     *
     * @param handler {Function} rpc filter error handler function.
     *
     * @api public
     */
    setErrorHandler(handler: MailStationErrorHandler) {
        this._station.handleError = handler;
    }

    /**
     * Generate prxoy for function type field
     *
     * @param client {Object} current client instance.
     * @param serviceName {String} delegated service name.
     * @param methodName {String} delegated method name.
     * @param args {Object} rpc invoke arguments.
     * @param attach {Object} attach parameter pass to proxyCB.
     * @param isToSpecifiedServer {boolean} true means rpc route to specified remote server.
     *
     * @api private
     */
    private rpcToRoute(routeParam: any, serviceName: string, methodName: string, args: Array<any>, attach: RemoteServerCode) {
        if (this.state !== STATE_STARTED) {
            return Promise.reject(new Error('[pinus-rpc] fail to invoke rpc proxy for client is not running'));
        }
        let serverType = attach.serverType;
        let msg = {
            namespace: attach.namespace,
            serverType: serverType,
            service: serviceName,
            method: methodName,
            args: args
        };

        return new Promise( (resolve, reject) => {
            this.targetRouterFunction(serverType, msg, routeParam, (err: Error, serverId: string) => {
                if (err) {
                    return reject(err);
                }
                this.rpcInvoke(serverId, msg,  (err: Error, resp: string) => err ? reject(err) : resolve(resp));
            });
        });
    }


    /**
     * Rpc to specified server id or servers.
     *
     * @param client     {Object} current client instance.
     * @param msg        {Object} rpc message.
     * @param serverType {String} remote server type.
     * @param serverId   {Object} mailbox init context parameter.
     * @param cb        {Function} AsyncResultArrayCallback<{}, {}>
     *
     * @api private
     */
    private rpcToSpecifiedServer(serverId: string, serviceName: string, methodName: string, args: Array<any>, attach: RemoteServerCode) {
        if (this.state !== STATE_STARTED) {
            return Promise.reject(new Error('[pinus-rpc] fail to invoke rpc proxy for client is not running'));
        }
        let serverType = attach.serverType;
        let msg = {
            namespace: attach.namespace,
            serverType: serverType,
            service: serviceName,
            method: methodName,
            args: args
        };

        return new Promise((resolve, reject) => {
            if (typeof serverId !== 'string') {
                logger.error('[pinus-rpc] serverId is not a string : %s', serverId);
                return;
            }
            let cb = (err: Error, resp: any) => err ? reject(err) : resolve(resp);
            if (serverId === '*') {
                // (client._routeContext as RouteContextClass).getServersByType(serverType);
                let servers: string[];
                if(this._routeContext && (this._routeContext as RouteContextClass).getServersByType) {
                    const serverinfos = (this._routeContext as RouteContextClass).getServersByType(serverType);
                    if(serverinfos) {
                        servers = serverinfos.map(v => v.id);
                    }
                } else {
                    servers = this._station.serversMap[serverType];
                }
            //   console.log('servers  ', servers);
                if (!servers) {
                    logger.error('[pinus-rpc] serverType %s servers not exist', serverType);
                    return;
                }
                async.map(servers,  (serverId, next) => {
                    this.rpcInvoke(serverId, msg, next);
                }, cb);
            } else {
                this.rpcInvoke(serverId, msg, cb);
            }
        });
    }

    /**
     * Generate proxies for remote servers.
     *
     * @param client {Object} current client instance.
     * @param record {Object} proxy reocrd info. {namespace, serverType, path}
     * @param context {Object} mailbox init context parameter
     *
     * @api private
     */
    private generateProxy (record: RemoteServerCode, context: object) {
        if (!record) {
            return;
        }
        let res: { [key: string]: any }, name;
        let modules: { [key: string]: any } = Loader.load(record.path, context, false, false, LoaderPathType.PINUS_REMOTER);
        if (modules) {
            res = {};
            for (name in modules) {
                res[name] = this.genObjectProxy(
                    name,
                    modules[name],
                    record
                );
            }
        }
        return res;
    }


    /**
     * Create proxy.
     * @param  serviceName {String} deletgated service name
     * @param  origin {Object} delegated object
     * @param  attach {Object} attach parameter pass to proxyCB
     * @return {Object}      proxy instance
     */
    private genObjectProxy(serviceName: string, origin: any, attach: RemoteServerCode) {
        // generate proxy for function field
        let res: { [key: string]: Proxy } = {};
        let proto = listEs6ClassMethods(origin);
        for (let field of proto) {
            res[field] = this.genFunctionProxy(serviceName, field, origin, attach);
        }

        return res;
    }

    /**
     * Generate prxoy for function type field
     *
     * @param namespace {String} current namespace
     * @param serverType {String} server type string
     * @param serviceName {String} delegated service name
     * @param methodName {String} delegated method name
     * @param origin {Object} origin object
     * @param proxyCB {Functoin} proxy callback function
     * @returns function proxy
     */
    private genFunctionProxy(serviceName: string, methodName: string, origin: any, attach: RemoteServerCode) {
        let self = this;
        return (function (): Proxy {

            // 兼容旧的api
            let proxy: any = function () {
                let len = arguments.length;
                if (len < 1) {

                    logger.error('[pinus-rpc] invalid rpc invoke, arguments length less than 1, namespace: %j, serverType, %j, serviceName: %j, methodName: %j',
                        attach.namespace, attach.serverType, serviceName, methodName);
                    return Promise.reject(new Error('[pinus-rpc] invalid rpc invoke, arguments length less than 1'));
                }

                let routeParam = arguments[0];
                let args = new Array(len - 1);
                for (let i = 1; i < len; i++) {
                    args[i - 1] = arguments[i];
                }
                return self.rpcToRoute(routeParam, serviceName, methodName, args, attach);
            };

            // 新的api，通过路由参数决定发往哪个服务器
            proxy.route = (routeParam: any) => {
                return function (...args: any[]) {
                    return self.rpcToRoute(routeParam, serviceName, methodName, args, attach);
                };
            };
            // 新的api，发往指定的服务器id
            proxy.to = (serverId: string) => {
                return function (...args: any[]) {
                    return self.rpcToSpecifiedServer(serverId, serviceName, methodName, args, attach);
                };
            };
            // 新的api，广播出去
            proxy.broadcast = function (...args: any[]) {
                    return self.rpcToSpecifiedServer('*', serviceName, methodName, args, attach);
                };
            // 新的api，使用默认路由调用
            proxy.defaultRoute = function (...args: any[]) {
                    return self.rpcToRoute(null, serviceName, methodName, args, attach);
                };

            // 兼容旧的api
            proxy.toServer = function () {
                let len = arguments.length;
                if (len < 1) {

                    logger.error('[pinus-rpc] invalid rpc invoke, arguments length less than 1, namespace: %j, serverType, %j, serviceName: %j, methodName: %j',
                        attach.namespace, attach.serverType, serviceName, methodName);
                    return Promise.reject(new Error('[pinus-rpc] invalid rpc invoke, arguments length less than 1'));
                }

                let routeParam = arguments[0];
                let args = new Array(len - 1);
                for (let i = 1; i < len; i++) {
                    args[i - 1] = arguments[i];
                }
                return self.rpcToSpecifiedServer(routeParam, serviceName, methodName, args, attach);
            };

            return proxy;
        })();
    }
    /**
     * Calculate remote target server id for rpc client.
     *
     * @param client {Object} current client instance.
     * @param serverType {String} remote server type.
     * @param msg  {Object} RpcMsg
     * @param routeParam {Object} mailbox init context parameter.
     * @param cb {Function} return rpc remote target server id.
     *
     * @api private
     */
    private getRouteFunction(): TargetRouterFunction {
        if (!!this.routerType) {
            let method: (client: RpcClient, serverType: string, msg: RpcMsg, cb: (err: Error, serverId?: string) => void) => void;
            switch (this.routerType) {
                case constants.SCHEDULE.ROUNDROBIN:
                    method = router.rr;
                    break;
                case constants.SCHEDULE.WEIGHT_ROUNDROBIN:
                    method = router.wrr;
                    break;
                case constants.SCHEDULE.LEAST_ACTIVE:
                    method = router.la;
                    break;
                case constants.SCHEDULE.CONSISTENT_HASH:
                    method = router.ch;
                    break;
                default:
                    method = router.rd;
                    break;
            }
            return (serverType: string, msg: RpcMsg, routeParam: object, cb: (err: Error, serverId: string) => void) => {
                method.call(null, this, serverType, msg, function (err: Error, serverId: string) {
                    cb(err, serverId);
                });
            };
        } else {
            let route: RouterFunction, target: Object;
            if (typeof this.router === 'function') {
                route = this.router;
                target = null;
            } else if (typeof this.router.route === 'function') {
                route = this.router.route;
                target = this.router;
            } else {
                logger.error('[pinus-rpc] invalid route function.');
                return;
            }

            return (serverType: string, msg: RpcMsg, routeParam: object, cb: (err: Error, serverId: string) => void) => {
                route.call(target, routeParam, msg, this._routeContext, function (err: Error, serverId: string) {
                    cb(err, serverId);
                });
            };
        }
    }

}

/**
 * Create mail station.
 *
 * @param opts {Object} construct parameters.
 *
 * @api private
 */
function createStation(opts: RpcClientOpts) {
    return Station.createMailStation(opts);
}

/**
 * Add proxy into array.
 *
 * @param proxies {Object} rpc proxies
 * @param namespace {String} rpc namespace sys/user
 * @param serverType {String} rpc remote server type
 * @param proxy {Object} rpc proxy
 *
 * @api private
 */
function insertProxy(proxies: Proxies, namespace: string, serverType: string, proxy: { [key: string]: any }) {
    proxies[namespace] = proxies[namespace] || {};
    if (proxies[namespace][serverType]) {
        for (let attr in proxy) {
            proxies[namespace][serverType][attr] = proxy[attr];
        }
    } else {
        proxies[namespace][serverType] = proxy;
    }
}

/**
 * RPC client factory method.
 *
 * @param  {Object}      opts client init parameter.
 *                       opts.context: mail box init parameter,
 *                       opts.router: (optional) rpc message route function, route(routeParam, msg, cb),
 *                       opts.mailBoxFactory: (optional) mail box factory instance.
 * @return {Object}      client instance.
 */
export function createClient(opts: RpcClientOpts) {
    return new RpcClient(opts);
}

// module.exports.WSMailbox from ('./mailboxes/ws-mailbox'); // socket.io
// module.exports.WS2Mailbox from ('./mailboxes/ws2-mailbox'); // ws
// export { create as MQTTMailbox } from './mailboxes/mqtt-mailbox'; // mqtt



