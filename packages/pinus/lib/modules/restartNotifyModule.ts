import * as path from 'path';
import {getLogger} from 'pinus-logger';
import {ConsoleService, IModule, MasterAgent, MonitorAgent, MonitorCallback} from 'pinus-admin';
import {Application} from '../application';
import {KEYWORDS, ServerInfo} from '../util/constants';
import {events} from '../index';

let logger = getLogger('pinus', path.basename(__filename));


export class RestartNotifyModule implements IModule {
    app: Application;
    service: any;
    id: string;

    static moduleId = 'RestartNotifyModule';
    private readonly removedServers: { [key: string]: boolean } = {};

    private _addEvent = this.onAddServers.bind(this);
    private _removeEvent = this.onRemoveServers.bind(this);

    constructor(opts: { app: Application }, consoleService: ConsoleService) {
        this.app = opts.app;
        this.service = consoleService;

    }


    // ----------------- bind methods -------------------------

    private onAddServers(servers: ServerInfo[]) {
        if (!servers || !servers.length) {
            return;
        }
        servers.forEach(val => this.onServerAdd(val));
    }

    private onRemoveServers(ids: string[]) {
        if (ids && ids.length) {
            ids.forEach(val => this.onServerLeave(val));
        }

    }

    private onServerAdd(record: ServerInfo) {
        if (this.removedServers[record.id]) {
            this.removedServers[record.id] = false;
            // TOxDO notify afterStartAll
            const masterAgent = this.service.agent as MasterAgent;
            logger.warn('notify afterStartAll ', record.id);
            process.nextTick(() => {
                masterAgent.request(record.id, 'RestartNotifyModule', {action: 'afterStartCallback'}, (err, body) => {
                    logger.warn('RestartNotifyModule notify RestartNotifyModule afterStart:', record.id, err, body);
                    // 通知startOver
                    masterAgent.request(record.id, KEYWORDS.MONITOR_WATCHER, {action: 'startOver'}, (err, body) => {
                        logger.warn('RestartNotifyModule notify MONITOR_WATCHER start over:', record.id, err, body);
                    });
                });
            });
        }
    }


    private onServerLeave(id: string) {
        logger.debug('RestartNotifyModule onServerLeave: %s', id);
        if (!id) {
            logger.warn('onServerLeave receive server id is empty.');
            return;
        }
        this.removedServers[id] = true;
    }

    private afterStartCallBack: any = null;
    private afterStartCalled = false;

    afterStart() {
        logger.debug('~~ RestartNotifyModule afterStart', this.id);
        this.afterStartCalled = true;
        if (this.afterStartCallBack) {
            this.afterStartCallBack(1);
            this.afterStartCallBack = null;
        }
    }

    // ----------------- module methods -------------------------

    start(cb: () => void) {
        //    subscribeRequest(this, this.service.agent, this.id, cb);
        this.id = this.app.getServerId();
        if (this.app.getServerType() === 'master') {
            if (this.service.master) {
                this.app.event.on(events.ADD_SERVERS, this._addEvent);
                this.app.event.on(events.REMOVE_SERVERS, this._removeEvent);
            }
        } else {
            this.app.event.on(events.START_SERVER, this.afterStart.bind(this));
        }
        cb();
    }


    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        if (!msg || !msg.action) {
            return;
        }
        switch (msg.action) {
            case 'afterStartCallback': {
                logger.warn('RestartNotifyModule afterStart notify ', this.id, msg);
                if (this.afterStartCalled) {
                    cb(1 as any);
                    break;
                }
                this.afterStartCallBack = cb;
                break;
            }
            default: {
                logger.error('RestartNotifyModule unknown action: %j', msg.action);
                return;
            }
        }
    }
}



