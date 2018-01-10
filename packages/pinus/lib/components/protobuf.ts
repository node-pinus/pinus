import * as fs from 'fs';
import * as path from 'path';
import { Protobuf} from 'pinus-protobuf';
import * as Constants from '../util/constants';
import * as crypto from 'crypto';
import { getLogger } from 'pinus-logger';
import { Application } from '../application';
import { IComponent } from '../interfaces/IComponent';
let logger = getLogger('pinus', path.basename(__filename));

export interface ProtobufComponentOptions {
    serverProtos ?: string;
    clientProtos ?: string;
}


export class ProtobufComponent implements IComponent {
    app: Application;

    watchers: {[key: string]: fs.FSWatcher} = {};
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

    constructor(app: Application, opts ?: ProtobufComponentOptions) {
        this.app = app;
        opts = opts || {};

        let env = app.get(Constants.RESERVED.ENV);
        let originServerPath = path.join(app.getBase(), Constants.FILEPATH.SERVER_PROTOS);
        let presentServerPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.SERVER_PROTOS));
        let originClientPath = path.join(app.getBase(), Constants.FILEPATH.CLIENT_PROTOS);
        let presentClientPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CLIENT_PROTOS));

        this.serverProtosPath = opts.serverProtos || (fs.existsSync(originServerPath) ? Constants.FILEPATH.SERVER_PROTOS : presentServerPath);
        this.clientProtosPath = opts.clientProtos || (fs.existsSync(originClientPath) ? Constants.FILEPATH.CLIENT_PROTOS : presentClientPath);

        this.setProtos(Constants.RESERVED.SERVER, path.join(app.getBase(), this.serverProtosPath));
        this.setProtos(Constants.RESERVED.CLIENT, path.join(app.getBase(), this.clientProtosPath));

        this.protobuf = new Protobuf({ encoderProtos: this.serverProtos, decoderProtos: this.clientProtos });
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
        if (!fs.existsSync(path)) {
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
        let watcher = fs.watch(path, this.onUpdate.bind(this, type, path));
        if (this.watchers[type]) {
            this.watchers[type].close();
        }
        this.watchers[type] = watcher;
    }

    onUpdate(type: string, path: string, event: string) {
        if (event !== 'change') {
            return;
        }

        let self = this;
        fs.readFile(path, 'utf8',  (err, data) => {
            try {
                let protos = Protobuf.parse(JSON.parse(data));
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
            } catch (e) {
                logger.warn('change proto file error! path : %j', path);
                logger.warn(e);
            }
        });
    }

    stop(force: boolean, cb: () => void) {
        for (let type in this.watchers) {
            this.watchers[type].close();
        }
        this.watchers = {};
        process.nextTick(cb);
    }
}