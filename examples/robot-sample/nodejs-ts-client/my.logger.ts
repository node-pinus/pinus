import * as util from 'util';
import { Logger } from './logger.service';

export const enum MyLogLevel {
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4

}

export class MyLogger extends Logger {
    constructor(context: string,
                isTimeDiffEnabled = false,
    ) {
        super(MyLogger.LogPrefix + context, isTimeDiffEnabled);
    }

    public static LogPrefix: string = '';
    public static level = MyLogLevel.DEBUG;

    log(message, ...args) {
        if (MyLogger.level >= MyLogLevel.INFO) {
            message = 'LOG<><>' + message;
            message = util.format(message, ...args);
            super.log(message);
        }
    }

    info(message, ...args) {
        if (MyLogger.level >= MyLogLevel.INFO) {
            message = 'INFO<><>' + message;
            message = util.format(message, ...args);
            super.log(message);
        }
    }

    debug(message, ...args) {
        if (MyLogger.level >= MyLogLevel.DEBUG) {
            message = 'DEBUG<><>' + message;
            message = util.format(message, ...args);
            super.warn(message);
        }
    }

    error(message, ...args) {
        if (MyLogger.level >= MyLogLevel.ERROR) {
            message = 'ERROR<><>' + message;
            message = util.format(message, ...args);
            super.error(message);
        }
    }

    warn(message, ...args) {
        if (MyLogger.level >= MyLogLevel.WARN) {
            message = 'WARN<><>' + message;
            message = util.format(message, ...args);
            super.warn(message);
        }
    }
}