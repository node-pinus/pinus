import { pinus } from 'pinus';
import { preload } from './preload';
import { createBasePlugin } from 'pinus-base-plugin';

/**
 *  替换全局Promise
 *  自动解析sourcemap
 *  捕获全局错误
 */
preload();

/**
 * Init app for client.
 */
let app = pinus.createApp();
app.set('name', 'pinus-example');

// app configuration
app.configure('production|development', 'connector', function () {
    app.set('connectorConfig',
        {
            connector: pinus.connectors.hybridconnector,
            heartbeat: 3,
            useDict: true,
            useProtobuf: true
        });
});

// 载入测试的组件
app.use(createBasePlugin());

// start app
app.start();

