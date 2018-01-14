import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../util/utils';
import * as Loader from 'pinus-loader';
import * as pathUtil from '../util/pathUtil';
import * as crypto from 'crypto';
import { Application } from '../application';
import { IComponent } from '../interfaces/IComponent';
import { listEs6ClassMethods } from 'pinus-rpc';
import { RESERVED, ServerInfo } from '../util/constants';
import { LoaderPathType } from 'pinus-loader';

export interface DictionaryComponentOptions {
    dict ?: string;
}

export class DictionaryComponent implements IComponent {
    app: Application;
    dict: {[key: string]: number} = {};
    abbrs: {[key: string]: string} = {};
    userDicPath: string;
    version = '';
    name = '__dictionary__';

    constructor(app: Application, opts: DictionaryComponentOptions) {
        this.app = app;

        // Set user dictionary
        let p = path.join(app.getBase(), '/config/dictionary.json');
        if (!!opts && !!opts.dict) {
            p = opts.dict;
        }
        if (fs.existsSync(p)) {
            this.userDicPath = p;
        }
    }

    afterStartAll() {
        let servers = this.app.serverTypeMaps;
        let routes = [];

        let handlerPathss: {[serverType: string]: string[]} = {};

        // Load all the handler files
        for (let serverType in servers) {
            let slist = servers[serverType];
            let server: ServerInfo;
            handlerPathss[serverType] = [];
            for(server of slist) {
                handlerPathss[serverType] = handlerPathss[serverType].concat(server.handlerPaths);
            }
        }

        // Load all the handler files
        for (let serverType in handlerPathss) {
            let paths = handlerPathss[serverType];
            if (!paths) {
                continue;
            }
            for (let p of paths) {
                let handlers = Loader.load(p, this.app, false, false, LoaderPathType.PINUS_HANDLER);

                for (let name in handlers) {
                    let handler = handlers[name];

                    let proto = listEs6ClassMethods(handler);
                    for (let key of proto) {
                        routes.push(serverType + '.' + name + '.' + key);
                    }
                }
            }
        }

        // Sort the route to make sure all the routers abbr are the same in all the servers
        routes.sort();

        console.warn('after start all server, use route dictionary :\n', routes.join('\n'));

        let abbr;
        let i;
        for (i = 0; i < routes.length; i++) {
            abbr = i + 1;
            this.abbrs[abbr] = routes[i];
            this.dict[routes[i]] = abbr;
        }

        // Load user dictionary
        if (!!this.userDicPath) {
            let userDic = require(this.userDicPath);

            abbr = routes.length + 1;
            for (i = 0; i < userDic.length; i++) {
                let route = userDic[i];

                this.abbrs[abbr] = route;
                this.dict[route] = abbr;
                abbr++;
            }
        }

        this.version = crypto.createHash('md5').update(JSON.stringify(this.dict)).digest('base64');

    }

    getDict() {
        return this.dict;
    }

    getAbbrs() {
        return this.abbrs;
    }

    getVersion() {
        return this.version;
    }

}