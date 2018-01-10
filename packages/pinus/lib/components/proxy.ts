/**
 * Component for proxy.
 * Generate proxies for rpc client.
 */
import * as crc from 'crc';
import * as utils from '../util/utils';
import { default as events } from '../util/events';
import { RpcClient , createClient} from 'pinus-rpc';
import * as pathUtil from '../util/pathUtil';
import * as Constants from '../util/constants';
import { getLogger } from 'pinus-logger';
import { Application } from '../application';
import { IComponent } from '../interfaces/IComponent';
import { RpcClientOpts } from 'pinus-rpc';
import { ServerInfo } from '../util/constants';
import { Session } from '../index';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));

export interface ProxyComponentOptions extends RpcClientOpts {
     rpcClient ?: {
         create: (opts: RpcClientOpts) => RpcClient;
    };
    bufferMsg ?: boolean;
    cacheMsg ?: boolean;
    interval ?: number;

    enableRpcLog ?: boolean;
}

/**
 * Proxy component class
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 */
export class ProxyComponent implements IComponent {
    app: Application;
    opts: ProxyComponentOptions;
    client: RpcClient;
    constructor(app: Application, opts: ProxyComponentOptions) {
        opts = opts || {};
        // proxy default config
        // cacheMsg is deprecated, just for compatibility here.
        opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
        opts.interval = opts.interval || 30;
        opts.router = genRouteFun();
        opts.context = app;
        opts.routeContext = app;
        if (app.enabled('rpcDebugLog')) {
            opts.rpcDebugLog = true;
            opts.rpcLogger = getLogger('rpc-debug', path.basename(__filename));
        }

        this.app = app;
        this.opts = opts;
        this.client = genRpcClient(this.app, opts);
        this.app.event.on(events.ADD_SERVERS, this.addServers.bind(this));
        this.app.event.on(events.REMOVE_SERVERS, this.removeServers.bind(this));
        this.app.event.on(events.REPLACE_SERVERS, this.replaceServers.bind(this));
    }

    name = '__proxy__';

    /**
     * Proxy component lifecycle function
     *
     * @param {Function} cb
     * @return {Void}
     */
    start(cb: (err?: Error) => void) {
        if (this.opts.enableRpcLog) {
            logger.warn('enableRpcLog is deprecated in 0.8.0, please use app.rpcFilter(pinus.rpcFilters.rpcLog())');
        }
        let rpcBefores = this.app.get(Constants.KEYWORDS.RPC_BEFORE_FILTER);
        let rpcAfters = this.app.get(Constants.KEYWORDS.RPC_AFTER_FILTER);
        let rpcErrorHandler = this.app.get(Constants.RESERVED.RPC_ERROR_HANDLER);

        if (!!rpcBefores) {
            this.client.before(rpcBefores);
        }
        if (!!rpcAfters) {
            this.client.after(rpcAfters);
        }
        if (!!rpcErrorHandler) {
            this.client.setErrorHandler(rpcErrorHandler);
        }
        process.nextTick(cb);
    }

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    afterStart(cb: (err?: Error) => void) {
        let self = this;

        Object.defineProperty(this.app, 'rpc', {
            get : function () {
                return self.client.proxies.user;
            }
        });

        Object.defineProperty(this.app, 'sysrpc', {
            get : function () {
                return self.client.proxies.sys;
            }
        });
        this.app.rpcInvoke =  this.client.rpcInvoke.bind(this.client);

        this.client.start(cb);
    }

    /**
     * Add remote server to the rpc client.
     *
     * @param {Array} servers server info list, {id, serverType, host, port}
     */
    addServers(servers: ServerInfo[]) {
        if (!servers || !servers.length) {
            return;
        }

        genProxies(this.client, this.app, servers);
        this.client.addServers(servers);
    }

    /**
     * Remove remote server from the rpc client.
     *
     * @param  {Array} ids server id list
     */
    removeServers(ids: string[]) {
        this.client.removeServers(ids);
    }

    /**
     * Replace remote servers from the rpc client.
     *
     * @param  {Array} ids server id list
     */
    replaceServers(servers: ServerInfo[]) {
        if (!servers || !servers.length) {
            return;
        }

        // update proxies
        this.client.proxies = {};
        genProxies(this.client, this.app, servers);

        this.client.replaceServers(servers);
    }

    /**
     * Proxy for rpc client rpcInvoke.
     *
     * @param {String}   serverId remote server id
     * @param {Object}   msg      rpc message: {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param {Function} cb      callback function
     */
    rpcInvoke(serverId: string, msg: any , cb: (err: Error, ...args: any[]) => void) {
        this.client.rpcInvoke(serverId, msg, cb);
    }
}

/**
 * Generate rpc client
 *
 * @param {Object} app current application context
 * @param {Object} opts contructor parameters for rpc client
 * @return {Object} rpc client
 */
let genRpcClient = function (app: Application, opts: RpcClientOpts & {rpcClient ?: {create: (opts: RpcClientOpts) => RpcClient; }}) {
    opts.context = app;
    opts.routeContext = app;
    if (!!opts.rpcClient) {
        return opts.rpcClient.create(opts);
    } else {
        return createClient(opts);
    }
};

/**
 * Generate proxy for the server infos.
 *
 * @param  {Object} client rpc client instance
 * @param  {Object} app    application context
 * @param  {Array} sinfos server info list
 */
let genProxies = function (client: RpcClient, app: Application, sinfos: ServerInfo[]) {
    let item;
    for (let i = 0, l = sinfos.length; i < l; i++) {
        item = sinfos[i];
        client.addProxies(getProxyRecords(app, item));
    }
};

/**
 * Check a server whether has generated proxy before
 *
 * @param  {Object}  client rpc client instance
 * @param  {Object}  sinfo  server info
 * @return {Boolean}        true or false
 */
let hasProxy = function (client: RpcClient, sinfo: ServerInfo) {
    let proxy = client.proxies;
    return !!proxy.sys && !!proxy.sys[sinfo.serverType];
};

/**
 * Get proxy path for rpc client.
 * Iterate all the remote service path and create remote path record.
 *
 * @param {Object} app current application context
 * @param {Object} sinfo server info, format: {id, serverType, host, port}
 * @return {Array}     remote path record array
 */
let getProxyRecords = function (app: Application, sinfo: ServerInfo) {
    return sinfo.remoterPaths;
};

let genRouteFun = function () {
    return function (session: Session, msg: any, app: Application, cb: RouteCallback) {
        let routes = app.get(Constants.KEYWORDS.ROUTE);

        if (!routes) {
            defaultRoute(session, msg, app, cb);
            return;
        }

        let type = msg.serverType,
            route = routes[type] || routes['default'];

        if (route) {
            route(session, msg, app, cb);
        } else {
            defaultRoute(session, msg, app, cb);
        }
    };
};

export type RouteCallback = (err: Error , routeToServerId ?: string) => void;

let defaultRoute = function (session: Session, msg: any, app: Application, cb: RouteCallback) {
    let list = app.getServersByType(msg.serverType);
    if (!list || !list.length) {
        cb(new Error('can not find server info for type:' + msg.serverType));
        return;
    }

    let uid = session ? (session.uid || '') : '';
    let index = Math.abs(crc.crc32(uid.toString())) % list.length;
    utils.invokeCallback(cb, null, list[index].id);
};

export type RouteFunction = (routeFrom: any, msg: any, app: Application, cb: RouteCallback) => void;
export type RouteMaps = {[key: string]: RouteFunction};
