import { Application, ChannelService, FrontendSession, RemoterClass } from 'pinus';

export default function (app: Application) {
    return new AnotherName(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface MergeChatRemoter {
        anotherName: RemoterClass<null, AnotherName>;
    }

    interface UserRpc {
        chat: MergeChatRemoter
    }
}

export class AnotherName {

    constructor(private app: Application) {
        this.app = app;
    }


    public async zzzMethod(uid: string, sid: string, name: string) {
        console.log("~~~~  zzzMethod ", uid, sid, name)
        return null
    }
}