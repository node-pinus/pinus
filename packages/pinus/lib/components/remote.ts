/**
 * Component for remote service.
 * Load remote service and add to global context.
 */
import * as fs from 'fs';
import * as pathUtil from '../util/pathUtil';
import { createServer, Gateway, RpcServerOpts, Remoters, Remoter, RemoteServerCode } from 'pinus-rpc';
import { Application } from '../application';
import { IComponent } from '../interfaces/IComponent';
import { getLogger, Logger } from 'pinus-logger';
import { ServerInfo } from '../util/constants';
import * as path from 'path';

export interface RemoteComponentOptions extends RpcServerOpts {
    bufferMsg?: boolean;
    cacheMsg?: boolean;
    interval?: number;

    rpcDebugLog?: boolean;
    rpcLogger?: Logger;

    rpcServer?: { create: (opts ?: RemoteComponentOptions) => Gateway };

    /**
     * convert remote path to relative path (need to upgrade pinus-loader to a supported version)
     * If you want to deploy the project to different paths on multiple servers,
     * or use the packaging tool to package and deploy on multiple servers, you can enable this function.
     * each process will have its own running path as the root path
     */
    relativePath?: boolean;
}

/**
 * Remote component class
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 */
export class RemoteComponent implements IComponent {
    opts: RemoteComponentOptions;

    constructor(private app: Application, opts?: RemoteComponentOptions) {
        opts = opts || {};
        this.opts = opts;

        // cacheMsg is deprecated, just for compatibility here.
        opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
        opts.interval = opts.interval || 30;
        if (app.enabled('rpcDebugLog')) {
            opts.rpcDebugLog = true;
            opts.rpcLogger = getLogger('rpc-debug', path.basename(__filename));
        }
        
        opts.relativePath = opts.relativePath || false;
        opts.paths = this.getRemotePaths(opts.relativePath);
        opts.context = this.app;

        let remoters: Remoters = {};
        opts.services = {};
        opts.services['user'] = remoters;


        let info = this.app.getCurrentServer();
        // 添加插件中的remoter到ServerInfo中
        for (let plugin of this.app.usedPlugins) {
            if (plugin.remoterPath) {
                opts.paths.push({
                    namespace: 'user',
                    serverType: info.serverType,
                    path: plugin.remoterPath
                });
            }
        }

        // 添加路径到ServerInfo中
        info.remoterPaths = opts.paths;


    }

    name = '__remote__';
    remote: Gateway;

    /**
     * Remote component lifecycle function
     *
     * @param {Function} cb
     * @return {Void}
     */
    start(cb: () => void) {
        this.opts.port = this.app.getCurServer().port;
        this.remote = this.genRemote(this.opts);
        this.remote.start();
        process.nextTick(cb);
    }

    /**
     * Remote component lifecycle function
     *
     * @param {Boolean}  force whether stop the component immediately
     * @param {Function}  cb
     * @return {Void}
     */
    stop(force: boolean, cb: () => void) {
        this.remote.stop(force);
        process.nextTick(cb);
    }

    /**
     * Get remote paths from application
     *
     * @param {Boolean} relativePath convert path to relative path
     * @return {Array} paths
     *
     */
    getRemotePaths(relativePath?: boolean): RemoteServerCode[] {
        let paths = [];

        let role;
        // master server should not come here
        if (this.app.isFrontend()) {
            role = 'frontend';
        } else {
            role = 'backend';
        }

        let sysPath = pathUtil.getSysRemotePath(role), serverType = this.app.getServerType();
        if (sysPath !== null) {
            paths.push(pathUtil.remotePathRecord('sys', serverType, sysPath, relativePath));
        }
        let userPath = pathUtil.getUserRemotePath(this.app.getBase(), serverType);
        if (userPath !== null) {
            paths.push(pathUtil.remotePathRecord('user', serverType, userPath, relativePath));
        }

        return paths;
    }

    /**
     * Generate remote server instance
     *
     * @param {Object} app current application context
     * @param {Object} opts contructor parameters for rpc Server
     * @return {Object} remote server instance
     */
    genRemote(opts: RemoteComponentOptions) {
        if (!!opts.rpcServer) {
            return opts.rpcServer.create(opts);
        } else {
            return createServer(opts);
        }
    }

}

export function manualReloadRemoters(app: Application) {
    if (!app.components.__remote__) {
        return
    }
    const remote = app.components.__remote__.remote;
    if (remote['manualReloadRemoters']) {
        remote['manualReloadRemoters']();
    } else {
        console.warn('manualReloadRemoters  no method');
    }
}