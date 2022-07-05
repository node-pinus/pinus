import {Promise} from 'bluebird';
// 支持注解
import 'reflect-metadata';
import { pinus } from 'pinus';

/**
 *  替换全局Promise
 *  自动解析sourcemap
 *  捕获全局错误
 */
export function preload() {
    // 使用bluebird输出完整的promise调用链
    ((global as any).Promise as any) = (Promise as any);
    // 开启长堆栈
    Promise.config({
        // Enable warnings
        warnings: true,
        // Enable long stack traces
        longStackTraces: true,
        // Enable cancellation
        cancellation: true,
        // Enable monitoring
        monitoring: true
    });

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
