import { NestFactory } from "@nestjs/core";
import { Application, IComponent, manualReloadCrons, manualReloadHandlers, manualReloadRemoters } from "pinus";



/**
 *
 */
export class NestComponent implements IComponent {
    name = "NestComponent";
    app: Application;

    constructor(app: Application) {
        this.app = app;
        this.app.set(this.name, this);
    }

    /**
     * 组件开始
     */
    start(cb) {
        cb();
    }

    beforeStart(cb) {
        this.bootstrap().then(async result => {
            this.app.set('nestjs', result);
            cb();
        })
    }


    /**
     * 组件结束
     * @param cb
     */
    afterStart(cb) {
        process.nextTick(cb);

    }

    // 热更新. 只是示例 需要根据自己的逻辑处理自己的逻辑
    public async hotUpdate() {
        if (this.app.getServerType() == 'master') {
            return;
        }
        // 这里放热更新代码


        // 清除自己逻辑相关的缓存


        // 生成新的nestapp
        await new Promise((resolve) => {
            this.beforeStart(() => {
                resolve(null)
            })
        })

        // 热更新框架
        console.log(this.app.getServerId(), 'logic hot update  handler')
        manualReloadHandlers(this.app)
        console.log(this.app.getServerId(), 'logic hot update  remoter')
        manualReloadRemoters(this.app)
        // manualReloadProxies(this.app)
        console.log(this.app.getServerId(), 'logic hot update  crons')
        manualReloadCrons(this.app)
        console.log(this.app.getServerId(), 'logic hot update  finished')
    }

    private async bootstrap() {
        const servertype = this.app.getServerType();
        let moduleLocal: any = null;
        console.log("bootstrap servertype")
        switch (servertype) {
            case 'connector': {
                moduleLocal = require('../servers/connector.module').ConnectorServerModule;
                console.log('nestApp init: connector');
                break;
            }
            case 'chat': {
                moduleLocal = require('../servers/chat.module').ChatServerModule;
                console.log('nestApp init: chat');
                break;
            }
            case 'gate': {
                moduleLocal = require('../servers/gate.module').GateServerModule;
                console.log('nestApp init: gate');
                break;
            }
            default:
                console.warn(' unknow  pinus server type . no nestModule::', servertype);
                return null
        }
        console.log('servertype:', servertype, 'before create nestApp');
        const nestApp = await NestFactory.createApplicationContext(moduleLocal);
        console.log('servertype:', servertype, 'create nest end');
        await nestApp.init();
        console.log('servertype:', servertype, 'init nest end');
        // 没有listen ,因为只是用nestjs的依赖注入
        return nestApp;
    }
}