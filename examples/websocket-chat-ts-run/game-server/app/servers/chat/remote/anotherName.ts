import { Application, ChannelService, FrontendSession, RemoterClass } from 'pinus';
import { Injectable } from '@nestjs/common';
import { getNestClass } from '../../../util/nestutil';

export default function (app: Application) {
    return getNestClass(app, AnotherName);
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

@Injectable()
export class AnotherName {

    constructor(private app: Application) {
        this.app = app;
    }


    public async zzzMethod(uid: string, sid: string, name: string) {
        console.log("~~~~  zzzMethod ", uid, sid, name);
        return null;
    }
}