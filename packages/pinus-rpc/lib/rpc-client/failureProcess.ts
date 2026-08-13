import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'failprocess');
import { constants } from '../util/constants';
import * as utils from '../util/utils';

export function failureProcess(this: any, code: string, tracer: any, serverId: string, msg: object, opts: {failMode: string}) {
    let cb = tracer && tracer.cb;
    let mode = opts.failMode;
    let FAIL_MODE = constants.FAIL_MODE;
    let method = failfast;

    if (mode === FAIL_MODE.FAILOVER) {
        method = failover;
    } else if (mode === FAIL_MODE.FAILBACK) {
        method = failback;
    } else if (mode === FAIL_MODE.FAILFAST) {

    }
    // switch (mode) {
    //     case constants.FAIL_MODE.FAILOVER:
    //         method = failover;
    //         break;
    //     case constants.FAIL_MODE.FAILBACK:
    //         method = failback;
    //         break;
    //     case constants.FAIL_MODE.FAILFAST:
    //         method = failfast;
    //         break;
    //     case constants.FAIL_MODE.FAILSAFE:
    //     default:
    //         method = failfast;
    //         break;
    // }
    method.call(this, code, tracer, serverId, msg, opts, cb);
}

/**
 * Failover rpc failure process. This will try other servers with option retries.
 *
 * @param code {Number} error code number.
 * @param tracer {Object} current rpc tracer.
 * @param serverId {String} rpc remote target server id.
 * @param msg {Object} rpc message.
 * @param opts {Object} rpc client options.
 * @param cb {Function} user rpc callback.
 *
 * @api private
 */
let failover = function (this: any, code: number, tracer: {servers: object}, serverId: string, msg: {serverType: string}, opts: object, cb: Function) {
    let servers;
    let self = this;
    let counter = 0;
    let success = true;
    let serverType = msg.serverType;
    if (!tracer || !tracer.servers) {
        servers = self.serversMap[serverType];
    } else {
        servers = tracer.servers;
    }

    let index = servers.indexOf(serverId);
    if (index >= 0) {
        servers.splice(index, 1);
    }
    tracer && (tracer.servers = servers);

    if (!servers.length) {
        logger.error('[pinus-rpc] rpc failed with all this type of servers, with serverType: %s', serverType);
        cb(new Error('rpc failed with all this type of servers, with serverType: ' + serverType));
        return;
    }
    self.dispatch.call(self, tracer, servers[0], msg, opts, cb);
};


/**
 * Failsafe rpc failure process.
 *
 * @param code {Number} error code number.
 * @param tracer {Object} current rpc tracer.
 * @param serverId {String} rpc remote target server id.
 * @param msg {Object} rpc message.
 * @param opts {Object} rpc client options.
 * @param cb {Function} user rpc callback.
 *
 * @api private
 */
let failsafe = function (this: any, code: number, tracer: {[key: string]: any}, serverId: string, msg: {serverType: string}, opts: {[key: string]: any}, cb: Function) {
    let self = this;
    let retryTimes = opts.retryTimes || constants.DEFAULT_PARAM.FAILSAFE_RETRIES;
    let retryConnectTime = opts.retryConnectTime || constants.DEFAULT_PARAM.FAILSAFE_CONNECT_TIME;
    if (tracer && !tracer.retryTimes) {
        tracer.retryTimes = 1;
    } else if (tracer) {
        tracer.retryTimes += 1;
    }
    switch (code) {
        case constants.RPC_ERROR.SERVER_NOT_STARTED:
        case constants.RPC_ERROR.NO_TRAGET_SERVER:
            cb(new Error('rpc client is not started or cannot find remote server.'));
            break;
        case constants.RPC_ERROR.FAIL_CONNECT_SERVER:
            if (tracer && tracer.retryTimes <= retryTimes) {
                setTimeout(function () {
                    self.connect(tracer, serverId, msg, cb);
                }, retryConnectTime * tracer.retryTimes);
            } else {
                cb(new Error('rpc client failed to connect to remote server: ' + serverId));
            }
            break;
        case constants.RPC_ERROR.FAIL_FIND_MAILBOX:
        case constants.RPC_ERROR.FAIL_SEND_MESSAGE:
            if (tracer && tracer.retryTimes <= retryTimes) {
                setTimeout(function () {
                    self.dispatch.call(self, tracer, serverId, msg, opts, cb);
                }, retryConnectTime * tracer.retryTimes);
            } else {
                cb(new Error('rpc client failed to send message to remote server: ' + serverId));
            }
            break;
        case constants.RPC_ERROR.FILTER_ERROR:
            cb(new Error('rpc client filter encounters error.'));
            break;
        default:
            cb(new Error('rpc client unknown error.'));
    }
};

/**
 * Failback rpc failure process. This will try the same server with sendInterval option and retries option.
 *
 * @param code {Number} error code number.
 * @param tracer {Object} current rpc tracer.
 * @param serverId {String} rpc remote target server id.
 * @param msg {Object} rpc message.
 * @param opts {Object} rpc client options.
 * @param cb {Function} user rpc callback.
 *
 * @api private
 */
let failback = function (code: number, tracer: {[key: string]: any}, serverId: string, msg: {serverType: string}, opts: {[key: string]: any}, cb: Function) {
    // todo record message in background and send the message at timing
};

/**
 * Failfast rpc failure process. This will ignore error in rpc client.
 *
 * @param code {Number} error code number.
 * @param tracer {Object} current rpc tracer.
 * @param serverId {String} rpc remote target server id.
 * @param msg {Object} rpc message.
 * @param opts {Object} rpc client options.
 * @param cb {Function} user rpc callback.
 *
 * @api private
 */
let failfast = function (code: number, tracer: {[key: string]: any}, serverId: string, msg: {serverType: string}, opts: {[key: string]: any}, cb: Function) {
    logger.error('rpc failed with error, remote server: %s, msg: %j, error code: %s', serverId, msg, code);
    cb && cb(new Error('rpc failed with error code: ' + code));
};
