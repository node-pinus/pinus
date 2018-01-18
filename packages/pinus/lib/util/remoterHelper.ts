
/**
 * 不带路由参数的远程调用代理
 */
export interface RemoterProxy<F> {
    /**
     * 使用默认路由参数null调用rpc
     */
    defaultRoute: F;
    /**
     * 路由到serverId服务器，并返回rpc函数
     */
    to(serverId: string): F;
    /**
     * 广播到所有定义了这个remoter的服务器
     */
    broadcast: F;
}

/**
 * 带路由参数的远程调用代理
 */
export interface RemoterProxyWithRoute<ROUTE, F> extends RemoterProxy<F> {
    /**
     * 路由到routeParam，并返回rpc调用函数
     */
    route(routeParam: ROUTE): F;

    // 兼容老的写法
    (routeParam: ROUTE, ...args: any[]): Promise<any>;
    toServer(serverId: string, ...args: any[]): Promise<any>;
    toServer(serverId: '*', ...args: any[]): Promise<any[]>;
}

export function bindRemoterMethod<ROUTE, T, R, F>(method: F & (() => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE) => Promise<R>) & { toServer(serverId: string): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, R, F>(method: F & ((arg1: T1) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1) => Promise<R>) & { toServer(serverId: string, arg1: T1): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, R, F>(method: F & ((arg1: T1, arg2: T2) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, T3, R, F>(method: F & ((arg1: T1, arg2: T2, arg3: T3) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2, arg3: T3) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2, arg3: T3): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, T3, T4, R, F>(method: F & ((arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2, arg3: T3, arg4: T4): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, T3, T4, T5, R, F>(method: F & ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, T3, T4, T5, T6, R, F>(method: F & ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, T3, T4, T5, T6, T7, R, F>(method: F & ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T): Promise<R> };
export function bindRemoterMethod<ROUTE, T, T1, T2, T3, T4, T5, T6, T7, T8, R, F>(method: F & ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8) => Promise<R>), thisArg: T, routeParamType: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> & ((routeParam: ROUTE, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8) => Promise<R>) & { toServer(serverId: string, arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, arg7: T7, arg8: T8): Promise<R> };
export function bindRemoterMethod<T extends object, F extends Function, ROUTE>(method: F, thisArg: T): RemoterProxy<F>;
export function bindRemoterMethod<T extends object, F extends Function, ROUTE>(method: F, thisArg: T, routeParamType?: new (...args: any[]) => ROUTE): RemoterProxyWithRoute<ROUTE, F> {
    return method.bind(thisArg) as any;
}

export type RemoterClass<ROUTE, T> = {
    [P in keyof T]?: RemoterProxyWithRoute<ROUTE, T[P]>;
};