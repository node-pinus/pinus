import { Application, FrontendSession, bindRemoterMethod } from 'pinus';


// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        chat: {
            helloRemotor: HelloRemotor;
        };
    }
}

export class HelloRemotor {
    constructor(private app: Application) {

    }
    // 导出远程调用方法
    hello = bindRemoterMethod(this._hello, this, FrontendSession);
    /**
     * 一个rpc函数的实现（给后端请求）
     * @param message rpc的参数，可以有多个
     * @returns 异步返回
     */
    private async _hello(message: string) {
        return message;
    }
}

export default function(app: Application) {
    return new HelloRemotor(app);
}
