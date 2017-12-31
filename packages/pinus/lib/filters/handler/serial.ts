/**
 * Filter to keep request sequence.
 */
import { getLogger } from 'pinus-logger'; var logger = getLogger('pinus', __filename);
import * as taskManager from '../../common/manager/taskManager';
import { RouteRecord } from '../../util/constants';
import { IHandlerFilter } from '../../interfaces/IHandlerFilter';
import { HandlerCallback } from '../../common/service/handlerService';
import { FrontendOrBackendSession } from '../../server/server';


export class SerialFilter implements IHandlerFilter
{
    constructor(private timeout : number)
    {
    };

    /**
     * request serialization after filter
     */
    before(routeRecord : RouteRecord , msg : any, session : FrontendOrBackendSession, next : HandlerCallback)
    {
        taskManager.addTask(session.id, function (task)
        {
            (session as any).__serialTask__ = task;
            next(null);
        }, function ()
        {
            logger.error('[serial filter] msg timeout, msg:' + JSON.stringify(msg));
        }, this.timeout);
    };

    /**
     * request serialization after filter
     */
    after(err : Error, routeRecord : RouteRecord , msg : any, session : FrontendOrBackendSession, resp : any, next : HandlerCallback)
    {
        var task = (session as any).__serialTask__;
        if (task)
        {
            if (!task.done() && !err)
            {
                err = new Error('task time out. msg:' + JSON.stringify(msg));
            }
        }
        next(err);
    };
}