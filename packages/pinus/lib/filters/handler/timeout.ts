/**
 * Filter for timeout.
 * Print a warn information when request timeout.
 */
import {getLogger} from 'pinus-logger';

let logger = getLogger('pinus', __filename);
import * as  utils from '../../util/utils';
import {IHandlerFilter} from '../../interfaces/IHandlerFilter';
import {RouteRecord} from '../../util/constants';
import {HandlerCallback} from '../../common/service/handlerService';
import {FrontendOrBackendSession} from '../../server/server';

let DEFAULT_TIMEOUT = 3000;
let DEFAULT_SIZE = 500;

export class TimeoutFilter implements IHandlerFilter {
    timeouts: { [id: number]: NodeJS.Timer } = {};
    curId = 0;
    private timeOutCount = 0;

    constructor(private timeout = DEFAULT_TIMEOUT, private maxSize = DEFAULT_SIZE) {
    }

    before(routeRecord: RouteRecord, msg: any, session: FrontendOrBackendSession, next: HandlerCallback) {
        if (this.timeOutCount > this.maxSize) {
            logger.warn('timeout filter is out of range, current size is %s, max size is %s', this.timeOutCount, this.maxSize);
            next(null);
            return;
        }
        this.curId++;
        this.timeOutCount++;
        this.timeouts[this.curId] = setTimeout(function () {
            logger.error('request %j timeout.', routeRecord.route);
        }, this.timeout);
        (session as any).__timeout__ = this.curId;
        next(null);
    }

    after(err: Error, routeRecord: RouteRecord, msg: any, session: FrontendOrBackendSession, resp: any, next: HandlerCallback) {
        let timeout = this.timeouts[(session as any).__timeout__];
        if (timeout) {
            clearTimeout(timeout);
            this.timeOutCount--;
            this.timeouts[(session as any).__timeout__] = undefined;
        }
        next(err);
    }

}