/*!
 * Pinus -- consoleModule runScript
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */

import { getLogger } from 'pinus-logger';
import * as monitor from 'pinus-monitor';
import * as vm from 'vm';
import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import { IModule, MonitorCallback, MasterCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';
let logger = getLogger('pinus-admin', path.basename(__filename));

export class ScriptsModule implements IModule {
    app: any;
    root: string;
    commands: {[key: string]: Function};

    static moduleId = 'scripts';

    constructor(opts: {app: string , path: string}) {
        this.app = opts.app;
        this.root = opts.path;
        this.commands = {
            'list': list,
            'get': get,
            'save': save,
            'run': run
        };
    }

    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        let context = {
            app: this.app,
            require: require,
            os: require('os'),
            fs: require('fs'),
            process: process,
            util: util,
            result: undefined as any
        };
        try {
            vm.createContext(context);
            vm.runInNewContext(msg.script, context);

            let result = context.result;
            if (!result) {
                cb(null, 'script result should be assigned to result value to script module context');
            } else {
                cb(null, result);
            }
        } catch (e) {
            cb(null, e.toString());
        }

        // cb(null, vm.runInContext(msg.script, context));
    }

    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        let fun = this.commands[msg.command];
        if (!fun || typeof fun !== 'function') {
            cb('unknown command:' + msg.command);
            return;
        }

        fun(this, agent, msg, cb);
    }
}

/**
 * List server id and scripts file name
 */
let list = function(scriptModule: ScriptsModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    let servers: string[] = [];
    let scripts: string[] = [];
    let idMap = agent.idMap;

    for (let sid in idMap) {
        servers.push(sid);
    }

    fs.readdir(scriptModule.root, function(err, filenames) {
        if (err) {
            filenames = [];
        }
        for (let i = 0, l = filenames.length; i < l; i++) {
            scripts.push(filenames[i]);
        }

        cb(null, {
            servers: servers,
            scripts: scripts
        });
    });
};

/**
 * Get the content of the script file
 */
let get = function(scriptModule: ScriptsModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    let filename = msg.filename;
    if (!filename) {
        cb('empty filename');
        return;
    }

    fs.readFile(path.join(scriptModule.root, filename), 'utf-8', function(err, data) {
        if (err) {
            logger.error('fail to read script file:' + filename + ', ' + err.stack);
            cb('fail to read script with name:' + filename);
        }

        cb(null, data);
    });
};

/**
 * Save a script file that posted from admin console
 */
let save = function(scriptModule: ScriptsModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    let filepath = path.join(scriptModule.root, msg.filename);

    fs.writeFile(filepath, msg.body, function(err) {
        if (err) {
            logger.error('fail to write script file:' + msg.filename + ', ' + err.stack);
            cb('fail to write script file:' + msg.filename);
            return;
        }

        cb();
    });
};

/**
 * Run the script on the specified server
 */
let run = function(scriptModule: ScriptsModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    agent.request(msg.serverId, ScriptsModule.moduleId, msg, function(err, res) {
        if (err) {
            logger.error('fail to run script for ' + err.stack);
            return;
        }
        cb(null, res);
    });
};