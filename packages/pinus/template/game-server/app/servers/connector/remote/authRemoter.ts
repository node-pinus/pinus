import { Application, FrontendSession, bindRemoterMethod, RemoterClass } from 'pinus';

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
     *
     * @param username
     * @param password
     */
    async auth(username: string , password: string) {
        return true;
    }

}