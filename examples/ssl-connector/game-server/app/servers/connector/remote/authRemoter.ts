import {Application, FrontendSession, RemoterClass} from 'pinus';

export default function (app: Application) {
    return new AuthRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        connector: {
            // 一次性定义一个类自动合并到UserRpc中
            authRemoter: RemoterClass<FrontendSession, AuthRemoter>;
        };
    }
}


export class AuthRemoter {
    constructor(private app: Application) {

    }

    /**
     * 远程rpc方法
     * @param username
     * @param password
     */
    public async auth(username: string, password: string) {
        return true;
    }

    public async rpcTest(username: string, password: string) {
        return true;
    }
}