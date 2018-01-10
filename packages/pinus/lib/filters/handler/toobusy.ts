/**
 * Filter for toobusy.
 * if the process is toobusy, just skip the new request
 */
import { getLogger } from 'pinus-logger';
import { IHandlerFilter } from '../../interfaces/IHandlerFilter';
import { RouteRecord } from '../../util/constants';
import { HandlerCallback } from '../../common/service/handlerService';
import { FrontendOrBackendSession } from '../../server/server';

let conLogger = getLogger('con-log', __filename);
let toobusy: any = null;
let DEFAULT_MAXLAG = 70;


export class ToobusyFilter implements IHandlerFilter {
    constructor(maxLag = DEFAULT_MAXLAG) {
        try {
            toobusy = require('toobusy');
        } catch (e) {
        }
        if (!!toobusy) {
            toobusy.maxLag(maxLag);
        }
    }

    before(routeRecord: RouteRecord , msg: any, session: FrontendOrBackendSession, next: HandlerCallback) {
        if (!!toobusy && toobusy()) {
            conLogger.warn('[toobusy] reject request msg: ' + msg);
            let err = new Error('Server toobusy!');
            (err as any).code = 500;
            next(err);
        } else {
            next(null);
        }
    }
}