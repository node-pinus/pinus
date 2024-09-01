// 支持注解
import 'reflect-metadata';
import { pinus } from 'pinus';

/**
 *  替换全局Promise
 *  自动解析sourcemap
 *  捕获全局错误
 */
export function preload() {

    // 自动解析ts的sourcemap
    require('source-map-support').install({
        handleUncaughtExceptions: false
    });

    // 捕获普通异常
    process.on('uncaughtException', function (err) {
        console.error(pinus.app ? pinus.app.getServerId() : "unknownServerId", 'uncaughtException Caught exception: ', err);
    });

    // 捕获async异常
    process.on('unhandledRejection', (reason: any, p) => {
        console.error(pinus.app ? pinus.app.getServerId() : "unknownServerId", 'Caught Unhandled Rejection at:', p, 'reason:', reason);
    });
}
