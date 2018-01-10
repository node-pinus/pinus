/**
 * Filter for rpc log.
 * Reject rpc request when toobusy
 */
import { getLogger } from 'pinus-logger';
import {IRpcFilter} from 'pinus-rpc';
let rpcLogger = getLogger('rpc-log', __filename);
let toobusy: any = null;

let DEFAULT_MAXLAG = 70;


export class RpcToobusyFilter implements IRpcFilter {
    constructor(maxLag = DEFAULT_MAXLAG) {
        try {
            toobusy = require('toobusy');
        } catch (e) {
        }
        if (!!toobusy) {
            toobusy.maxLag(maxLag);
        }
    }

    name = 'toobusy';

    /**
     * Before filter for rpc
     */
    before(serverId: string, msg: any, opts: any, next: (target?: Error | string, message?: any, options?: any) => void) {
        opts = opts || {};
        if (!!toobusy && toobusy()) {
            rpcLogger.warn('Server too busy for rpc request, serverId:' + serverId + ' msg: ' + msg);
            let err = new Error('Backend server ' + serverId + ' is too busy now!');
            (err as any).code = 500;
            next(err);
        } else {
            next();
        }
    }
}