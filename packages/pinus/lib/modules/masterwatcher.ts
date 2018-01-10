import { getLogger } from 'pinus-logger';
import * as utils from '../util/utils';
import * as Constants from '../util/constants';
import { Watchdog} from '../master/watchdog';
import { Application } from '../application';
import { IModule, ConsoleService, MasterAgent, MasterCallback } from 'pinus-admin';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));



export class MasterWatcherModule implements IModule {
    app: Application;
    service: ConsoleService;
    id: string;
    watchdog: Watchdog;

    static moduleId = Constants.KEYWORDS.MASTER_WATCHER;


    constructor(opts: {app: Application}, consoleService: ConsoleService) {
        this.app = opts.app;
        this.service = consoleService;
        this.id = this.app.getServerId();

        this.watchdog = new Watchdog(this.app, this.service);
        this.service.on('register', this.onServerAdd.bind(this));
        this.service.on('disconnect', this.onServerLeave.bind(this));
        this.service.on('reconnect', this.onServerReconnect.bind(this));
    }

    // ----------------- bind methods -------------------------

    onServerAdd(record: any) {
        logger.debug('masterwatcher receive add server event, with server: %j', record);
        if (!record || record.type === 'client' || !record.serverType) {
            return;
        }
        this.watchdog.addServer(record);
    }

    onServerReconnect(record: any) {
        logger.debug('masterwatcher receive reconnect server event, with server: %j', record);
        if (!record || record.type === 'client' || !record.serverType) {
            logger.warn('onServerReconnect receive wrong message: %j', record);
            return;
        }
        this.watchdog.reconnectServer(record);
    }

    onServerLeave(id: string, type: string) {
        logger.debug('masterwatcher receive remove server event, with server: %s, type: %s', id, type);
        if (!id) {
            logger.warn('onServerLeave receive server id is empty.');
            return;
        }
        if (type !== 'client') {
            this.watchdog.removeServer(id);
        }
    }

    // ----------------- module methods -------------------------

    start(cb: () => void) {
        utils.invokeCallback(cb);
    }

    masterHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        if (!msg) {
            logger.warn('masterwatcher receive empty message.');
            return;
        }
        let func = (masterMethods as any)[msg.action];
        if (!func) {
            logger.info('masterwatcher unknown action: %j', msg.action);
            return;
        }
        func(this, agent, msg, cb);
    }
}

// ----------------- monitor request methods -------------------------

let subscribe = function (module: MasterWatcherModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    if (!msg) {
        utils.invokeCallback(cb, new Error('masterwatcher subscribe empty message.'));
        return;
    }

    module.watchdog.subscribe(msg.id);
    utils.invokeCallback(cb, null, module.watchdog.query());
};

let unsubscribe = function (module: MasterWatcherModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    if (!msg) {
        utils.invokeCallback(cb, new Error('masterwatcher unsubscribe empty message.'));
        return;
    }
    module.watchdog.unsubscribe(msg.id);
    utils.invokeCallback(cb);
};

let query = function (module: MasterWatcherModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    utils.invokeCallback(cb, null, module.watchdog.query());
};

let record = function (module: MasterWatcherModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    if (!msg) {
        utils.invokeCallback(cb, new Error('masterwatcher record empty message.'));
        return;
    }
    module.watchdog.record(msg.id);
};

let masterMethods = {
    'subscribe': subscribe,
    'unsubscribe': unsubscribe,
    'query': query,
    'record': record
};