
import { Application, FrontendSession, BackendSession } from 'pinus';

// handler入口示例
export class HelloHandler {
    constructor(private app: Application) {

    }

    /**
     * 一个handler函数的实现（给客户端请求用）
     * @param msg 客户端请求
     * @param session 客户端的session，如果this.app.isFrontend()则session类型是FrontendSession，否则是BackendSession
     * @returns 异步返回数据给客户端
     */
    public async hello(msg: { data: string }, session: FrontendSession | BackendSession) {
        return {code: 0};
    }
}

export default function(app: Application) {
    return new HelloHandler(app);
}
