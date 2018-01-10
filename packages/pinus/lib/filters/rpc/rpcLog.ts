/**
 * Filter for rpc log.
 * Record used time for remote process call.
 */
import { getLogger } from 'pinus-logger';
let rpcLogger = getLogger('rpc-log', __filename);

import * as utils from '../../util/utils';
import {IRpcFilter} from 'pinus-rpc';

export class RpcLogFilter implements IRpcFilter {
    name = 'rpcLog';

    /**
     * Before filter for rpc
     */
    before(serverId: string, msg: any, opts: any, next: (target?: Error | string, message?: any, options?: any) => void) {
        opts = opts || {};
        opts.__start_time__ = Date.now();
        next();
    }

    /**
     * After filter for rpc
     */
    after(serverId: string, msg: any, opts: any, next: (target?: Error | string, message?: any, options?: any) => void) {
        if (!!opts && !!opts.__start_time__) {
            let start = opts.__start_time__;
            let end = Date.now();
            let timeUsed = end - start;
            let log = {
                route: msg.service,
                args: msg.args,
                time: utils.format(new Date(start)),
                timeUsed: timeUsed
            };
            rpcLogger.info(JSON.stringify(log));
        }
        next();
    }
}