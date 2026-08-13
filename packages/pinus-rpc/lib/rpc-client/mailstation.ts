import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'MailStation');
import { EventEmitter } from 'events';
// import * as blackhole from './mailboxes/blackhole';
import {
    createMqttMailBox as defaultMailboxFactory, IMailBox, IMailBoxFactory, MailBoxMessage,
    MailBoxOpts
} from './mailbox';
import { constants } from '../util/constants';
import * as utils from '../util/utils';
import * as util from 'util';
import { Tracer } from '../util/tracer';

let STATE_INITED = 1; // station has inited
let STATE_STARTED = 2; // station has started
let STATE_CLOSED = 3; // station has closed

export interface MailStationOpts {
    mailboxFactory?: IMailBoxFactory;
    pendingSize?: number;
}

export interface RpcServerInfo {
    id: string;
    host: string;
    port: number;
    serverType: string;
    weight ?: number;
}

export type RpcFilterFunction = (serverId: string, msg: any, opts: any, next: (target?: Error | string, message?: any, options?: any) => void) => void;
export interface IRpcFilter {
    name: string;
    before ?: RpcFilterFunction;
    after ?: RpcFilterFunction;
}
export type RpcFilter = RpcFilterFunction | IRpcFilter;
export type MailStationErrorHandler = (err: Error, serverId: string, msg: any, opts: any) => void;
/**
 * Mail station constructor.
 *
 * @param {Object} opts construct parameters
 */
export class MailStation extends EventEmitter {

    servers: {[serverId: string]: RpcServerInfo} = {}; // remote server info map, key: server id, value: info
    serversMap: {[serverType: string]: string[]} = {}; // remote server info map, key: serverType, value: servers array
    onlines: {[serverId: string]: number} = {}; // remote server online map, key: server id, value: 0/offline 1/online

    // filters
    befores: Array<RpcFilter> = [];
    afters: Array<RpcFilter> = [];

    // pending request queues
    pendings: {[serverId: string]: IArguments[]} = {};

    handleError ?: MailStationErrorHandler;

    // connecting remote server mailbox map
    connecting: {[serverId: string]: boolean} = {};

    // working mailbox map
    mailboxes: {[serverId: string]: IMailBox} = {};

    state = STATE_INITED;

    opts: MailStationOpts;
    mailboxFactory: IMailBoxFactory;
    pendingSize: number;
    constructor(opts?: MailStationOpts) {
        super();
        this.opts = opts;
        this.mailboxFactory = opts.mailboxFactory || defaultMailboxFactory;

        this.pendingSize = opts.pendingSize || constants.DEFAULT_PARAM.DEFAULT_PENDING_SIZE;

    }

    /**
     * Init and start station. Connect all mailbox to remote servers.
     *
     * @param  {Function} cb(err) callback function
     * @return {Void}
     */
    start(cb: (err?: Error) => void) {
        if (this.state > STATE_INITED) {
            cb(new Error('station has started.'));
            return;
        }

        let self = this;
        process.nextTick(function () {
            self.state = STATE_STARTED;
            cb();
        });
    }

    /**
     * Stop station and all its mailboxes
     *
     * @param  {Boolean} force whether stop station forcely
     * @return {Void}
     */
    stop(force: boolean) {
        if (this.state !== STATE_STARTED) {
            logger.warn('[pinus-rpc] client is not running now.');
            return;
        }
        this.state = STATE_CLOSED;

        let self: {[key: string]: any} = this;

        function closeAll() {
            for (let id in self.mailboxes) {
                self.mailboxes[id].close();
            }
        }
        if (force) {
            closeAll();
        } else {
            setTimeout(closeAll, constants.DEFAULT_PARAM.GRACE_TIMEOUT);
        }
    }

    /**
     * Add a new server info into the mail station and clear
     * the blackhole associated with the server id if any before.
     *
     * @param {Object} serverInfo server info such as {id, host, port}
     */
    addServer(serverInfo: RpcServerInfo) {
        if (!serverInfo || !serverInfo.id) {
            return;
        }

        let id = serverInfo.id;
        let type = serverInfo.serverType;
        this.servers[id] = serverInfo;
        this.onlines[id] = 1;

        if (!this.serversMap[type]) {
            this.serversMap[type] = [];
        }

        if (this.serversMap[type].indexOf(id) < 0) {
            this.serversMap[type].push(id);
        }
        this.emit('addServer', id);
    }

    /**
     * Batch version for add new server info.
     *
     * @param {Array} serverInfos server info list
     */
    addServers(serverInfos: Array<RpcServerInfo>) {
        if (!serverInfos || !serverInfos.length) {
            return;
        }

        for (let i = 0, l = serverInfos.length; i < l; i++) {
            this.addServer(serverInfos[i]);
        }
    }

    /**
     * Remove a server info from the mail station and remove
     * the mailbox instance associated with the server id.
     *
     * @param  {String|Number} id server id
     */
    removeServer(id: string|number) {
        this.onlines[id] = 0;
        let mailbox = this.mailboxes[id];
        if (mailbox) {
            mailbox.close();
            delete this.mailboxes[id];
        }
        this.emit('removeServer', id);
    }

    /**
     * Batch version for remove remote servers.
     *
     * @param  {Array} ids server id list
     */
    removeServers(ids: Array<string|number>) {
        if (!ids || !ids.length) {
            return;
        }

        for (let i = 0, l = ids.length; i < l; i++) {
            this.removeServer(ids[i]);
        }
    }

    /**
     * Clear station infomation.
     *
     */
    clearStation() {
        this.onlines = {};
        this.serversMap = {};
    }

    /**
     * Replace remote servers info.
     *
     * @param {Array} serverInfos server info list
     */
    replaceServers(serverInfos: Array<RpcServerInfo>) {
        this.clearStation();
        if (!serverInfos || !serverInfos.length) {
            return;
        }

        for (let i = 0, l = serverInfos.length; i < l; i++) {
            let id = serverInfos[i].id;
            let type = serverInfos[i].serverType;
            this.onlines[id] = 1;
            if (!this.serversMap[type]) {
                this.serversMap[type] = [];
            }
            this.servers[id] = serverInfos[i];
            if (this.serversMap[type].indexOf(id) < 0) {
                this.serversMap[type].push(id);
            }
        }
    }

    /**
     * Dispatch rpc message to the mailbox
     *
     * @param  {Object}   tracer   rpc debug tracer
     * @param  {String}   serverId remote server id
     * @param  {Object}   msg      rpc invoke message
     * @param  {Object}   opts     rpc invoke option args
     * @param  {Function} cb       callback function
     * @return {Void}
     */
    dispatch(tracer: Tracer, serverId: string, msg: MailBoxMessage, opts: object, cb:  (err: Error , ...args: any[]) => void) {
        tracer && tracer.info('client', __filename, 'dispatch', 'dispatch rpc message to the mailbox');
        // tracer && (tracer.cb = cb);
        if (this.state !== STATE_STARTED) {
            tracer && tracer.error('client', __filename, 'dispatch', 'client is not running now');
            logger.error('[pinus-rpc] client is not running now.');
            this.emit('error', constants.RPC_ERROR.SERVER_NOT_STARTED, tracer, serverId, msg, opts);
            return;
        }

        let self = this;
        let mailbox = this.mailboxes[serverId];
        if (!mailbox) {
            tracer && tracer.debug('client', __filename, 'dispatch', 'mailbox is not exist');
            // try to connect remote server if mailbox instance not exist yet
            if (!lazyConnect(tracer, this, serverId, this.mailboxFactory, msg, cb)) {
                tracer && tracer.error('client', __filename, 'dispatch', 'fail to find remote server:' + serverId);
                logger.error('[pinus-rpc] fail to find remote server:' + serverId);
                self.emit('error', constants.RPC_ERROR.NO_TRAGET_SERVER, tracer, serverId, msg, opts);
            }
            // push request to the pending queue
            addToPending(tracer, this, serverId, arguments);
            return;
        }

        if (this.connecting[serverId]) {
            tracer && tracer.debug('client', __filename, 'dispatch', 'request add to connecting');
            // if the mailbox is connecting to remote server
            addToPending(tracer, this, serverId, arguments);
            return;
        }

        let send = function (tracer: Tracer, err: Error, serverId: string, msg: MailBoxMessage, opts: object) {
            tracer && tracer.info('client', __filename, 'send', 'get corresponding mailbox and try to send message');
            let mailbox = self.mailboxes[serverId];
            if (err) {
                return errorHandler(tracer, self, err, serverId, msg, opts, true, cb);
            }
            if (!mailbox) {
                tracer && tracer.error('client', __filename, 'send', 'can not find mailbox with id:' + serverId);
                logger.error('[pinus-rpc] could not find mailbox with id:' + serverId);
                self.emit('error', constants.RPC_ERROR.FAIL_FIND_MAILBOX, tracer, serverId, msg, opts);
                return;
            }
            mailbox.send(tracer, msg, opts, cb ? function (tracer_send: Tracer, send_err: Error, args: Array<any>) {
                // let tracer_send = arguments[0];
                // let send_err = arguments[1];
                if (send_err) {
                    logger.error('[pinus-rpc] fail to send message %s', send_err.stack || send_err.message);
                    self.emit('error', constants.RPC_ERROR.FAIL_SEND_MESSAGE, tracer, serverId, msg, opts);
                    cb && cb(send_err);
                    // utils.applyCallback(cb, send_err);
                    return;
                }
                // let args = arguments[2];
                doFilter(tracer_send, null, serverId, msg, opts, self.afters, 0, 'after', function (tracer: Tracer, err: Error, serverId: string, msg: object, opts: any) {
                    if (err) {
                        errorHandler(tracer, self, err, serverId, msg, opts, false, cb);
                    }
                    utils.applyCallback(cb, args);
                });
            } : null);
        };

        doFilter(tracer, null, serverId, msg, opts, this.befores, 0, 'before', send);
    }

    /**
     * Add a before filter
     *
     * @param  {[type]} filter [description]
     * @return {[type]}        [description]
     */
    before(filter: RpcFilter | RpcFilter[]) {
        if (Array.isArray(filter)) {
            this.befores = this.befores.concat(filter);
            return;
        }
        this.befores.push(filter);
    }

    /**
     * Add after filter
     *
     * @param  {[type]} filter [description]
     * @return {[type]}        [description]
     */
    after(filter: RpcFilter | RpcFilter[]) {
        if (Array.isArray(filter)) {
            this.afters = this.afters.concat(filter);
            return;
        }
        this.afters.push(filter);
    }

    /**
     * Add before and after filter
     *
     * @param  {[type]} filter [description]
     * @return {[type]}        [description]
     */
    filter(filter: RpcFilter) {
        this.befores.push(filter);
        this.afters.push(filter);
    }

    /**
     * Try to connect to remote server
     *
     * @param  {Object}   tracer   rpc debug tracer
     * @return {String}   serverId remote server id
     * @param  {Function}   cb     callback function
     */
    connect(tracer: Tracer, serverId: string, msg: any, cb: Function) {
        let self = this;
        let mailbox = self.mailboxes[serverId];
        mailbox.connect(tracer, function (err: Error) {
            if (!!err) {
                tracer && tracer.error('client', __filename, 'lazyConnect', 'fail to connect to remote server: ' + serverId);
                logger.error('[pinus-rpc] mailbox fail to connect to remote server: ' + serverId);
                if (!!self.mailboxes[serverId]) {
                    delete self.mailboxes[serverId];
                }
                self.emit('error', constants.RPC_ERROR.FAIL_CONNECT_SERVER, tracer, serverId, msg, self.opts);
                return;
            }
            mailbox.on('close', function (id: string) {
                let mbox = self.mailboxes[id];
                if (!!mbox) {
                    mbox.close();
                    delete self.mailboxes[id];
                }
                self.emit('close', id);
            });
            delete self.connecting[serverId];
            flushPending(tracer, self, serverId);
        });
    }
}
/**
 * Do before or after filter
 */
let doFilter = function (tracer: Tracer, err: Error, serverId: string, msg: MailBoxMessage, opts: object, filters: Array<RpcFilter>, index: number, operate: 'before' | 'after', cb: Function) {
    if (index < filters.length) {
        tracer && tracer.info('client', __filename, 'doFilter', 'do ' + operate + ' filter ' + filters[index].name);
    }
    if (index >= filters.length || !!err) {
        cb(tracer, err, serverId, msg, opts);
        return;
    }
    let filter = filters[index];
    if (typeof filter === 'function') {
        filter(serverId, msg, opts, function (target: any, message: MailBoxMessage, options: object) {
            index++;
            // compatible for pinus filter next(err) method
            if (utils.getObjectClass(target) === 'Error') {
                doFilter(tracer, target, serverId, msg, opts, filters, index, operate, cb);
            } else {
                doFilter(tracer, null, target || serverId, message || msg, options || opts, filters, index, operate, cb);
            }
        });
        return;
    }
    if (typeof filter[operate] === 'function') {
        filter[operate](serverId, msg, opts, function (target: Error&string, message: MailBoxMessage, options: any) {
            index++;
            if (utils.getObjectClass(target) === 'Error') {
                doFilter(tracer, target, serverId, msg, opts, filters, index, operate, cb);
            } else {
                doFilter(tracer, null, target || serverId, message || msg, options || opts, filters, index, operate, cb);
            }
        });
        return;
    }
    index++;
    doFilter(tracer, err, serverId, msg, opts, filters, index, operate, cb);
};

let lazyConnect = function (tracer: Tracer, station: MailStation, serverId: string, factory: IMailBoxFactory, msg: any, cb: Function) {
    tracer && tracer.info('client', __filename, 'lazyConnect', 'create mailbox and try to connect to remote server');
    let server = station.servers[serverId];
    let online = station.onlines[serverId];
    if (!server) {
        logger.error('[pinus-rpc] unknown server: %s', serverId);
        return false;
    }
    if (!online || online !== 1) {
        logger.error('[pinus-rpc] server is not online: %s', serverId);
        return false;
    }
    let mailbox = factory(server, station.opts as MailBoxOpts);
    station.connecting[serverId] = true;
    station.mailboxes[serverId] = mailbox;
    station.connect(tracer, serverId, msg, cb);
    return true;
};

let addToPending = function (tracer: Tracer, station: MailStation, serverId: string, args: IArguments) {
    tracer && tracer.info('client', __filename, 'addToPending', 'add pending requests to pending queue');
    let pending = station.pendings[serverId];
    if (!pending) {
        pending = station.pendings[serverId] = [];
    }
    if (pending.length > station.pendingSize) {
        tracer && tracer.debug('client', __filename, 'addToPending', 'station pending too much for: ' + serverId);
        logger.warn('[pinus-rpc] station pending too much for: %s', serverId);
        return;
    }
    pending.push(args);
};

let flushPending = function (tracer: Tracer, station: MailStation, serverId: string, cb?: Function) {
    tracer && tracer.info('client', __filename, 'flushPending', 'flush pending requests to dispatch method');
    let pending = station.pendings[serverId];
    let mailbox = station.mailboxes[serverId];
    if (!pending || !pending.length) {
        return;
    }
    if (!mailbox) {
        tracer && tracer.error('client', __filename, 'flushPending', 'fail to flush pending messages for empty mailbox: ' + serverId);
        logger.error('[pinus-rpc] fail to flush pending messages for empty mailbox: ' + serverId);
    }
    for (let i = 0, l = pending.length; i < l; i++) {
        station.dispatch.apply(station, pending[i]);
    }
    delete station.pendings[serverId];
};

let errorHandler = function (tracer: Tracer, station: MailStation, err: Error, serverId: string, msg: object, opts: object, flag: boolean, cb: Function) {
    if (!!station.handleError) {
        station.handleError(err, serverId, msg, opts);
    } else {
        logger.error('[pinus-rpc] rpc filter error with serverId: %s, err: %j', serverId, err.stack);
        station.emit('error', constants.RPC_ERROR.FILTER_ERROR, tracer, serverId, msg, opts);
    }
};

/**
 * Mail station factory function.
 *
 * @param  {Object} opts? construct paramters
 *           opts.servers {Object} global server info map. {serverType: [{id, host, port, ...}, ...]}
 *           opts.mailboxFactory {Function} mailbox factory function
 * @return {Object}      mail station instance
 */
export function createMailStation(opts?: MailStationOpts) {
    return new MailStation(opts || {});
}
