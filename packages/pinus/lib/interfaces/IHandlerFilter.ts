import { RouteRecord } from '../util/constants';
import { HandlerCallback } from '../common/service/handlerService';
import { FrontendOrBackendSession } from '../server/server';


export type BeforeHandlerFilterFunction = (routeRecord: RouteRecord , msg: any, session: FrontendOrBackendSession, cb: HandlerCallback) => void;
export type AfterHandlerFilterFunction = (err: Error, routeRecord: RouteRecord , msg: any, session: FrontendOrBackendSession, resp: any, cb: HandlerCallback) => void;

export interface IHandlerFilter {
    before ?: BeforeHandlerFilterFunction;
    after ?: AfterHandlerFilterFunction;
}

export type BeforeHandlerFilter = BeforeHandlerFilterFunction | IHandlerFilter;
export type AfterHandlerFilter = AfterHandlerFilterFunction | IHandlerFilter;