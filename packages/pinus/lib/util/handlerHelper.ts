import { FrontendOrBackendSession } from '../server/server';

export function bindHandlerMethod<T, MSG, R, F>(method: ((msg: MSG, session: FrontendOrBackendSession) => Promise<R>), thisArg: T): (msg: MSG) => Promise<R> {
    return method.bind(thisArg) as any;
}
