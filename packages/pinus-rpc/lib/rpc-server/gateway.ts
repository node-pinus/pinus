import {createDefaultAcceptor, IAcceptor, IAcceptorFactory} from './acceptor';
import { EventEmitter } from 'events';
import { Dispatcher, MsgPkg, Services } from './dispatcher';
import * as Loader from 'pinus-loader';
import * as utils from '../util/utils';
import {Tracer} from '../util/tracer';
import * as util from 'util';
import * as fs from 'fs';
import { AcceptorOpts } from './acceptor';
import { LoaderPathType } from 'pinus-loader';

export interface RpcServerOpts extends AcceptorOpts {
    port?: number|string;
    paths?: Array<RemoteServerCode>;
    context?: object;
    services?: Services;
    acceptorFactory?: IAcceptorFactory;
}

export interface RemoteServerCode {
    namespace: string;
    serverType: string;
    path: string;
}

export class Gateway extends EventEmitter {
    opts: any;
    port: number;
    started = false;
    stoped = false;
    services: Services;
    acceptor: IAcceptor;
    constructor(opts: RpcServerOpts) {
        super();
        this.opts = opts || {};
        this.port = <number>opts.port || 3050;
        this.started = false;
        this.stoped = false;
        let acceptorFactory = opts.acceptorFactory || createDefaultAcceptor;
        this.services = opts.services;
        let dispatcher = new Dispatcher(this.services);
        if (!!this.opts.reloadRemotes) {
            this.watchServices(dispatcher);
        }
        this.acceptor = acceptorFactory(opts as AcceptorOpts,  (tracer, msg, cb) => {
            dispatcher.route(tracer, msg, cb);
        });
    }


    stop(force: boolean) {
        if (!this.started || this.stoped) {
            return;
        }
        this.stoped = true;
        try {
            this.acceptor.close();
        } catch (err) { }
    }

    start() {
        if (this.started) {
            throw new Error('gateway already start.');
        }
        this.started = true;

        let self = this;
        this.acceptor.on('error', self.emit.bind(self, 'error'));
        this.acceptor.on('closed', self.emit.bind(self, 'closed'));
        this.acceptor.listen(this.port);
    }


    watchServices(dispatcher: Dispatcher) {
        let paths = this.opts.paths;
        let app = this.opts.context;
        for (let i = 0; i < paths.length; i++) {
            (function (index) {
                fs.watch(paths[index].path, function (event: string, name: string) {
                    if (event === 'change') {
                        let res: {[key: string]: any} = {};
                        let item = paths[index];
                        let m: {[key: string]: any} = Loader.load(item.path, app, true, true, LoaderPathType.PINUS_REMOTER);
                        if (m) {
                            createNamespace(item.namespace, res);
                            for (let s in m) {
                                res[item.namespace][s] = m[s];
                            }
                        }
                        dispatcher.emit('reload', res);
                    }
                });
            })(i);
        }
    }
}
/**
 * create and init gateway
 *
 * @param opts {services: {rpcServices}, connector:conFactory(optional), router:routeFunction(optional)}
 */
export function createGateway(opts: RpcServerOpts) {
    if (!opts || !opts.services) {
        throw new Error('opts and opts.services should not be empty.');
    }

    return new Gateway(opts);
}


let createNamespace = function (namespace: string, proxies: {[key: string]: object}) {
    proxies[namespace] = proxies[namespace] || {};
};