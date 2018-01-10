/**
 * Filter for statistics.
 * Record used time for each request.
 */
import { getLogger } from 'pinus-logger';
let conLogger = getLogger('con-log', __filename);
import * as utils from '../../util/utils';
import { IHandlerFilter } from '../../interfaces/IHandlerFilter';
import { RouteRecord } from '../../util/constants';
import { HandlerCallback } from '../../common/service/handlerService';
import { FrontendOrBackendSession } from '../../server/server';


export class TimeFilter implements IHandlerFilter {
    before(routeRecord: RouteRecord , msg: any, session: FrontendOrBackendSession, next: HandlerCallback) {
        (session as any).__startTime__ = Date.now();
        next(null);
    }

    after(err: Error, routeRecord: RouteRecord , msg: any, session: FrontendOrBackendSession, resp: any, next: HandlerCallback) {
        let start = (session as any).__startTime__;
        if (typeof start === 'number') {
            let timeUsed = Date.now() - start;
            let log = {
                route: routeRecord.route,
                args: msg,
                time: utils.format(new Date(start)),
                timeUsed: timeUsed
            };
            conLogger.info(JSON.stringify(log));
        }
        next(err);
    }
}