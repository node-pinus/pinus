import * as fs from 'fs';
import * as path from 'path';
import {Protobuf} from 'pinus-protobuf';
import * as Constants from '../util/constants';
import * as crypto from 'crypto';
import {getLogger} from 'pinus-logger';
import {Application} from '../application';
import {IComponent} from '../interfaces/IComponent';

let logger = getLogger('pinus', path.basename(__filename));

export interface ProtobufComponentOptions {
    serverProtos?: string;
    clientProtos?: string;
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

        let env = app.get(Constants.RESERVED.ENV);
        let originServerPath = path.join(app.getBase(), Constants.FILEPATH.SERVER_PROTOS);
        let presentServerPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.SERVER_PROTOS));
        let originClientPath = path.join(app.getBase(), Constants.FILEPATH.CLIENT_PROTOS);
        let presentClientPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CLIENT_PROTOS));

        this.serverProtosPath = opts.serverProtos || (this._canRequire(originServerPath) ? Constants.FILEPATH.SERVER_PROTOS : presentServerPath);
        this.clientProtosPath = opts.clientProtos || (this._canRequire(originClientPath) ? Constants.FILEPATH.CLIENT_PROTOS : presentClientPath);

        this.setProtos(Constants.RESERVED.SERVER, path.join(app.getBase(), this.serverProtosPath));
        this.setProtos(Constants.RESERVED.CLIENT, path.join(app.getBase(), this.clientProtosPath));

        this.protobuf = new Protobuf({encoderProtos: this.serverProtos, decoderProtos: this.clientProtos});
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

    onUpdate(type: string, path: string, event: string) {
        if (event !== 'change') {
            return;
        }

        let self = this;
        this.clearRequireCache(path);
        try {
            let protos = Protobuf.parse(require(path));
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
            this.watchers[type].close();
            this.watchers[type] = fs.watch(path, this.onUpdate.bind(this, type, path));
        } catch (e) {
            logger.warn('change proto file error! path : %j', path);
            logger.warn(e);
        }
    }

    stop(force: boolean, cb: () => void) {
        for (let type in this.watchers) {
            this.watchers[type].close();
        }
        this.watchers = {};
        process.nextTick(cb);
    }
}