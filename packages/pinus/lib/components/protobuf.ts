import * as fs from 'fs';
import * as path from 'path';
import { Protobuf } from 'pinus-protobuf';
import * as Constants from '../util/constants';
import * as crypto from 'crypto';
import { getLogger } from 'pinus-logger';
import { Application } from '../application';
import { IComponent } from '../interfaces/IComponent';
import AppEvents from '../util/events';

let logger = getLogger('pinus', path.basename(__filename));

export interface ProtobufComponentOptions {
    serverProtos?: string;
    clientProtos?: string;
    /**
     指定 pinus-protobuf encode使用 buffer缓存大小
     使用方法  在 connector配置参数
     app.set('protobufConfig', {
        // protobuf Encoder 使用 5m 的缓存 需要保证每个消息不会超过指定的缓存大小，超过了就会抛出异常
        encoderCacheSize: 5 * 1024 * 1024
     });
     如果缓存大小不够就会有错误日志
     缓存大小不够 日志示例
     [2020-03-27T10:44:48.752] [ERROR] pinus - [chat-server-1 channelService.js] [pushMessage] fail to dispatch msg to serverId: connector-server-1, err:RangeError [ERR_OUT_OF_RANGE]: The value of "offset" is out of range. It must be >= 0 and <= 0. Received 1
     at boundsError (internal/buffer.js:53:9)
     at writeU_Int8 (internal/buffer.js:562:5)
     at Buffer.writeUInt8 (internal/buffer.js:569:10)
     at Encoder.writeBytes (F:\develop\gong4-server\logicServer\pinus\packages\pinus-protobuf\lib\encoder.ts:195:20)
     */
    encoderCacheSize?: number;
    // decode 客户端请求消息时校验消息
    decodeCheckMsg?: boolean;
}


export class ProtobufComponent implements IComponent {
    app: Application;

    watchers: { [key: string]: fs.FSWatcher } = {};
    serverProtos: {
        [key: string]: any;
    } = {};
    clientProtos: {
        [key: string]: any;
    } = {};
    version = '';
    serverProtosPath: string;
    clientProtosPath: string;

    protobuf: Protobuf;
    name = '__protobuf__';

    _canRequire(path: string): boolean {
        try {
            require.resolve(path);
        } catch (err) {
            return false;
        }
        return true;
    }

    constructor(app: Application, opts ?: ProtobufComponentOptions) {
        this.app = app;
        opts = opts || {};
        logger.debug('ProtobufComponent options:', opts)
        let env = app.get(Constants.RESERVED.ENV);
        let originServerPath = path.join(app.getBase(), Constants.FILEPATH.SERVER_PROTOS);
        let presentServerPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.SERVER_PROTOS));
        let originClientPath = path.join(app.getBase(), Constants.FILEPATH.CLIENT_PROTOS);
        let presentClientPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CLIENT_PROTOS));

        this.serverProtosPath = opts.serverProtos || (this._canRequire(originServerPath) ? Constants.FILEPATH.SERVER_PROTOS : presentServerPath);
        this.clientProtosPath = opts.clientProtos || (this._canRequire(originClientPath) ? Constants.FILEPATH.CLIENT_PROTOS : presentClientPath);

        this.setProtos(Constants.RESERVED.SERVER, path.join(app.getBase(), this.serverProtosPath));
        this.setProtos(Constants.RESERVED.CLIENT, path.join(app.getBase(), this.clientProtosPath));

        this.protobuf = new Protobuf({
            encoderProtos: this.serverProtos,
            decoderProtos: this.clientProtos,
            encoderCacheSize: opts.encoderCacheSize,
            decodeCheckMsg: opts.decodeCheckMsg,
        });
    }


    encode(key: string, msg: any) {
        return this.protobuf.encode(key, msg);
    }

    encode2Bytes(key: string, msg: any) {
        return this.protobuf.encode2Bytes(key, msg);
    }

    decode(key: string, msg: any) {
        return this.protobuf.decode(key, msg);
    }

    getProtos() {
        return {
            server: this.serverProtos,
            client: this.clientProtos,
            version: this.version
        };
    }

    getVersion() {
        return this.version;
    }

    // 手动重新加载协议文件。
    public manualReloadProtos() {
        let truePath = path.join(this.app.getBase(), this.serverProtosPath);
        truePath = require.resolve(truePath);
        this.onUpdate(Constants.RESERVED.SERVER, truePath, 'change');
        truePath = path.join(this.app.getBase(), this.clientProtosPath);
        truePath = require.resolve(truePath);
        this.onUpdate(Constants.RESERVED.CLIENT, truePath, 'change');
    }

    setProtos(type: string, path: string) {
        if (!this._canRequire(path)) {
            return;
        }
        if (type === Constants.RESERVED.SERVER) {
            this.serverProtos = Protobuf.parse(require(path));
        }

        if (type === Constants.RESERVED.CLIENT) {
            this.clientProtos = Protobuf.parse(require(path));
        }

        let protoStr = JSON.stringify(this.clientProtos) + JSON.stringify(this.serverProtos);
        this.version = crypto.createHash('md5').update(protoStr).digest('base64');

        // Watch file
        const truePath = require.resolve(path);
        let watcher = fs.watch(truePath, this.onUpdate.bind(this, type, truePath));
        if (this.watchers[type]) {
            this.watchers[type].close();
        }
        this.watchers[type] = watcher;
    }

    clearRequireCache(path: string) {
        const moduleObj = require.cache[path];
        if (!moduleObj) {
            logger.warn('can not find module of truepath', path);
            return;
        }
        if (moduleObj.parent) {
            //    console.log('has parent ',moduleObj.parent);
            moduleObj.parent.children.splice(moduleObj.parent.children.indexOf(moduleObj), 1);
        }
        delete require.cache[path];
    }

    onUpdate(type: string, path: string, event: string, filename?: string, errTry?: boolean) {
        if (event !== 'change') {
            return;
        }

        let self = this;
        this.clearRequireCache(path);
        try {
            let protos = Protobuf.parse(require(path));
            // 预防 git checkout这样的操作导致获得的数据为空的情况
            if (!protos || !Object.keys(protos).length) {
                // retry.
                throw new Error('protos error');
            }
            if (type === Constants.RESERVED.SERVER) {
                this.protobuf.setEncoderProtos(protos);
                self.serverProtos = protos;
            } else {
                this.protobuf.setDecoderProtos(protos);
                self.clientProtos = protos;
            }

            let protoStr = JSON.stringify(self.clientProtos) + JSON.stringify(self.serverProtos);
            self.version = crypto.createHash('md5').update(protoStr).digest('base64');
            logger.info('change proto file , type : %j, path : %j, version : %j', type, path, self.version);
            // 抛出 proto 变化事件。
            self.app.event.emit(AppEvents.PROTO_CHANGED, type);
        } catch (e) {
            logger.error('change proto file error! path : %j', path, filename, errTry, e);
            if (!errTry) {
                logger.warn('setTimeout,try update proto');
                setTimeout(() => {
                    logger.warn('try update proto again');
                    this.onUpdate(type, path, event, filename, true);
                }, 3000);
            }

        }
        this.watchers[type].close();
        this.watchers[type] = fs.watch(path, this.onUpdate.bind(this, type, path));
    }

    stop(force: boolean, cb: () => void) {
        for (let type in this.watchers) {
            this.watchers[type].close();
        }
        this.watchers = {};
        process.nextTick(cb);
    }
}