import { Module } from '@nestjs/common';
import { MuteModule } from '../logic/mutemodule/mute.module';
import { pinusAppProvider } from '../util/nestutil';
import { CronTest } from './chat/cron/cronTest';
import { ChatHandler } from './chat/handler/chatHandler';
import { AnotherName } from './chat/remote/anotherName';
import { ChatRemote } from './chat/remote/chatRemote';
import { NotifyRemoter } from './chat/remote/notifyRemote';


// 数据库 provider
// https://docs.nestjs.com/fundamentals/custom-providers#export-custom-provider



@Module({
    imports: [MuteModule],
    controllers: [],
    providers: [pinusAppProvider, ChatHandler, AnotherName, ChatRemote, NotifyRemoter, CronTest],
    // 因为外部要用 需要需要导出
    exports: [ChatHandler, AnotherName, ChatRemote, NotifyRemoter, CronTest],
})
export class ChatServerModule { }
