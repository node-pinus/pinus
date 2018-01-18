import { Application, FrontendSession, bindRemoterMethod, RemoterClass } from 'pinus';


// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        chat: {
            // 一次性定义一个类自动合并到UserRpc中
            helloRemoter: RemoterClass<FrontendSession, HelloRemotor>;
        };
    }
}

export class HelloRemotor {
    constructor(private app: Application) {

    }
    /**
     * 一个rpc函数的实现（给后端请求）
     * @param message rpc的参数，可以有多个
     * @returns 异步返回
     */
    async hello(message: string) {
        return message;
    }
}

export default function(app: Application) {
    return new HelloRemotor(app);
}
