// 支持注解
import 'reflect-metadata';

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
        console.error('Caught exception: ' + err.stack);
    });

    // 捕获async异常
    process.on('unhandledRejection', (reason: any, p) => {
        console.error('Caught Unhandled Rejection at:' + p + 'reason:' + reason.stack);
    });
}