import { Application, ChannelService, FrontendSession, RemoterClass } from 'pinus';

export default function (app: Application) {
    return new NotifyRemoter(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface MergeChatRemoter {
        notifyRemote: RemoterClass<FrontendSession, NotifyRemoter>;
    }

    interface UserRpc {
        chat: MergeChatRemoter
    }
}

export class NotifyRemoter {

    constructor(private app: Application) {
        this.app = app;
    }


    public async notifyMethod(uid: string, sid: string, name: string) {
        console.log("notifyMethod@@!!!~~", uid, sid, name)
        return null
    }
}