import * as starter from './starter';
import { getLogger } from 'pinus-logger';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));
let crashLogger = getLogger('crash-log', path.basename(__filename));
let adminLogger = getLogger('admin-log', path.basename(__filename));
import * as admin from 'pinus-admin';
import * as util from 'util';
import * as utils from '../util/utils';
import * as moduleUtil from '../util/moduleUtil';
import * as Constants from '../util/constants';
import { Application } from '../application';
import { ConsoleService, ConsoleServiceOpts } from 'pinus-admin';
import { IModule } from '../index';


export type MasterServerOptions =
{
    port ?: number;
    env ?: string;
    closeWatcher?: boolean;
} & Partial<ConsoleServiceOpts>;

export class MasterServer {
    app: Application;
    masterInfo: any;
    registered = {};
    modules: IModule[] = [];
    closeWatcher: boolean;
    masterConsole: ConsoleService;

    constructor(app: Application, opts ?: MasterServerOptions) {
        this.app = app;
        this.masterInfo = app.getMaster();
        opts = opts || {};

        opts.port = this.masterInfo.port;
        opts.env = this.app.get(Constants.RESERVED.ENV);
        this.closeWatcher = opts.closeWatcher;
        this.masterConsole = admin.createMasterConsole(opts);
    }


    start(cb: (err?: Error) => void) {
        moduleUtil.registerDefaultModules(true, this.app, this.closeWatcher);
        moduleUtil.loadModules(this, this.masterConsole);

        let self = this;
        // start master console
        this.masterConsole.start(function (err) {
            if (err) {
                process.exit(0);
            }
            moduleUtil.startModules(self.modules, function (err: Error) {
                if (err) {
                    utils.invokeCallback(cb, err);
                    return;
                }

                if (self.app.get(Constants.RESERVED.MODE) !== Constants.RESERVED.STAND_ALONE) {
                    starter.runServers(self.app);
                }
                utils.invokeCallback(cb);
            });
        });

        this.masterConsole.on('error', function (err) {
            if (!!err) {
                logger.error('masterConsole encounters with error: ' + err.stack);
                return;
            }
        });

        this.masterConsole.on('reconnect', function (info) {
            self.app.addServers([info]);
        });

        // monitor servers disconnect event
        this.masterConsole.on('disconnect', function (id, type, info, reason) {
            crashLogger.info(util.format('[%s],[%s],[%s],[%s]', type, id, Date.now(), reason || 'disconnect'));
            let count = 0;
            let time = 0;
            let pingTimer: NodeJS.Timer = null;
            let server = self.app.getServerById(id);
            let stopFlags = self.app.get(Constants.RESERVED.STOP_SERVERS) || [];
            if (!!server && (server[Constants.RESERVED.AUTO_RESTART] === true || server[Constants.RESERVED.RESTART_FORCE] === true) && stopFlags.indexOf(id) < 0) {
                let setTimer = function (time: number) {
                    pingTimer = setTimeout(function () {
                        utils.ping(server.host, function (flag) {
                            if (flag) {
                                handle();
                            } else {
                                count++;
                                if (count > 3) {
                                    time = Constants.TIME.TIME_WAIT_MAX_PING;
                                } else {
                                    time = Constants.TIME.TIME_WAIT_PING * count;
                                }
                                setTimer(time);
                            }
                        });
                    }, time);
                };
                setTimer(time);
                let handle = function () {
                    clearTimeout(pingTimer);
                    utils.checkPort(server, function (status) {
                        if (status === 'error') {
                            utils.invokeCallback(cb, new Error('Check port command executed with error.'));
                            return;
                        } else if (status === 'busy') {
                            if (!!server[Constants.RESERVED.RESTART_FORCE]) {
                                starter.kill([info.pid], [server]);
                            } else {
                                utils.invokeCallback(cb, new Error('Port occupied already, check your server to add.'));
                                return;
                            }
                        }
                        setTimeout(function () {
                            starter.run(self.app, server, null);
                        }, Constants.TIME.TIME_WAIT_STOP);
                    });
                };
            }
        });

        // monitor servers register event
        this.masterConsole.on('register', function (record) {
            starter.bindCpu(record.id, record.pid, record.host);
        });

        this.masterConsole.on('admin-log', function (log, error) {
            if (error) {
                adminLogger.error(JSON.stringify(log));
            } else {
                adminLogger.info(JSON.stringify(log));
            }
        });
    }

    stop(cb: () => void) {
        this.masterConsole.stop();
        process.nextTick(cb);
    }
}