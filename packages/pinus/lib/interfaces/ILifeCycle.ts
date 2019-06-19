import { Application } from '../application';
import { IComponent } from './IComponent';

/**
 * 服务器生命周期
 */
export interface ILifeCycle {
    beforeStartup ?: (app: Application , cb: () => void) => void;
    afterStartup ?: (app: Application , cb: () => void) => void;
    // 所有进程启动好以后的通知。单个进程重启是不会有这个通知的。
    // 如果单独重启了master。 master内会有一个计数器。 其它进程重启到这个次数，就会发送这个通知（也就是说有可能重复通知afterStartAll）。
    // 可以通过注册使用 RestartNotifyModule admin模块，来实现重启单个逻辑进程时通知这个事件（这个模块可以避免重复通知）。
    afterStartAll ?: (app: Application) => void;

    beforeShutdown ?: (app: Application , shutDown: () => void , cancelShutDownTimer: () => void) => void;
}