import { Application } from '../application';
import { IComponent } from './IComponent';

/**
 * 服务器生命周期
 */
export interface ILifeCycle {
    beforeStartup ?: (app: Application , cb: () => void) => void;
    afterStartup ?: (app: Application , cb: () => void) => void;
    afterStartAll ?: (app: Application) => void;

    beforeShutdown ?: (app: Application , shutDown: () => void , cancelShutDownTimer: () => void) => void;
}