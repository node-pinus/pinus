import { Injectable } from '@nestjs/common';
import { Application, ChannelService, FrontendSession, RemoterClass } from 'pinus';
import { getNestClass } from '../../../util/nestutil';

export default function (app: Application) {
    return getNestClass(app, NotifyRemoter);
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

@Injectable()
export class NotifyRemoter {

    constructor(private app: Application) {
        this.app = app;
    }


    public async notifyMethod(uid: string, sid: string, name: string) {
        console.log("notifyMethod@@!!!~~", uid, sid, name)
        return null
    }
}