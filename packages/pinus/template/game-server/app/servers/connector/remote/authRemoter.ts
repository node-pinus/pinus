import { Application, FrontendSession, bindRemoterMethod } from 'pinus';

export default function (app: Application) {
    return new AuthRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        connector: {
            authRemoter: AuthRemoter;
        };
    }
}


export class AuthRemoter {
    constructor(private app: Application) {

    }

    // 导出远程调用方法
    auth = bindRemoterMethod(this._auth, this, FrontendSession);
    /**
     *
     * @param username
     * @param password
     */
    async _auth(username: string , password: string) {
        return true;
    }

}