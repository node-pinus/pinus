import { getLogger } from 'pinus-logger';
import { MqttServer, MqttSocket } from '../protocol/mqtt/mqttServer';
import { EventEmitter } from 'events';
import { MasterSocket } from './masterSocket';
import * as protocol from '../util/protocol';
import * as utils from '../util/utils';
import * as Util from 'util';
import { ConsoleService } from '../consoleService';
import * as mqtt_connection from 'mqtt-connection';
import { ServerInfo, AdminUserInfo, AdminServerInfo, Callback } from '../util/constants';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));

let ST_INITED = 1;
let ST_STARTED = 2;
let ST_CLOSED = 3;

export type WhiteList = string[];
export interface MasterAgentOptions { whitelist?: WhiteList; }


export interface AgentClient {
    id: string;
    type: string;
    pid: string;
    info: AdminUserInfo | ServerInfo;
    socket: MqttSocket;
}
export interface AuthUserRequest { username: string; password: string; md5: string; id: string; type: string; }
export interface AuthServerRequest { id: string; serverType: string; token: string; pid: string; info: ServerInfo; }
/**
 * MasterAgent Constructor
 *
 * @class MasterAgent
 * @constructor
 * @param {Object} opts construct parameter
 *                 opts.consoleService {Object} consoleService
 *                 opts.id             {String} server id
 *                 opts.type           {String} server type, 'master', 'connector', etc.
 *                 opts.socket         {Object} socket-io object
 *                 opts.reqId          {Number} reqId add by 1
 *                 opts.callbacks      {Object} callbacks
 *                 opts.state          {Number} MasterAgent state
 * @api public
 */
export class MasterAgent extends EventEmitter {

    reqId = 1;
    idMap: { [serverId: string]: AgentClient } = {};
    msgMap: {
        [serverId: string]: {
            [reqId: number]: {
                moduleId: string,
                msg: any
            }
        }
    } = {};
    typeMap: { [type: string]: AgentClient[] } = {};
    clients: { [id: string]: AgentClient } = {};
    sockets: { [id: string]: mqtt_connection } = {};
    slaveMap: { [serverId: string]: AgentClient[] } = {};
    server: MqttServer = null;
    callbacks: { [reqId: number]: Callback } = {};
    state = ST_INITED;

    whitelist: WhiteList;
    consoleService: ConsoleService;

    constructor(consoleService: ConsoleService, opts: MasterAgentOptions) {
        super();
        this.whitelist = opts.whitelist;
        this.consoleService = consoleService;
    }

    /**
     * master listen to a port and handle register and request
     *
     * @param {String} port
     * @api public
     */
    listen(port: number, cb: (err?: Error) => void) {
        if (this.state > ST_INITED) {
            logger.error('master agent has started or closed.');
            return;
        }

        this.state = ST_STARTED;
        this.server = new MqttServer();
        this.server.listen(port);
        // this.server = sio.listen(port);
        // this.server.set('log level', 0);

        cb = cb || function () { };

        let self = this;
        this.server.on('error', function (err) {
            self.emit('error', err);
            cb(err);
        });

        this.server.once('listening', function () {
            setImmediate(function () {
                cb();
            });
        });

        this.server.on('connection', function (socket) {
            // let id, type, info, registered, username;
            let masterSocket = new MasterSocket();
            masterSocket['agent'] = self;
            masterSocket['socket'] = socket;

            self.sockets[socket.id] = socket;

            socket.on('register', function (msg: any) {
                // register a new connection
                masterSocket.onRegister(msg);
            }); // end of on 'register'

            // message from monitor
            socket.on('monitor', function (msg: any) {
                masterSocket.onMonitor(msg);
            }); // end of on 'monitor'

            // message from client
            socket.on('client', function (msg: any) {
                masterSocket.onClient(msg);
            }); // end of on 'client'

            socket.on('reconnect', function (msg: any) {
                masterSocket.onReconnect(msg);
            });

            socket.on('disconnect', function () {
                masterSocket.onDisconnect();
            });

            socket.on('close', function () {
                masterSocket.onDisconnect();
            });

            socket.on('error', function (err: Error) {
                masterSocket.onError(err);
            });
        }); // end of on 'connection'
    } // end of listen

    /**
     * close master agent
     *
     * @api public
     */
    close() {
        if (this.state > ST_STARTED) {
            return;
        }
        this.state = ST_CLOSED;
        this.server.close();
    }

    /**
     * set module
     *
     * @param {String} moduleId module id/name
     * @param {Object} value module object
     * @api public
     */
    set(moduleId: string, value: any) {
        this.consoleService.set(moduleId, value);
    }

    /**
     * get module
     *
     * @param {String} moduleId module id/name
     * @api public
     */
    get(moduleId: string) {
        return this.consoleService.get(moduleId);
    }

    /**
     * getClientById
     *
     * @param {String} clientId
     * @api public
     */
    getClientById(clientId: string) {
        return this.clients[clientId];
    }

    /**
     * request monitor{master node} data from monitor
     *
     * @param {String} serverId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @param {Function} callback function
     * @api public
     */
    request(serverId: string, moduleId: string, msg: any, cb: (errOrResult?: Error | any, body?: any) => void) {
        if (this.state > ST_STARTED) {
            return false;
        }

        cb = cb || function () { };

        let curId = this.reqId++;
        this.callbacks[curId] = cb;

        if (!this.msgMap[serverId]) {
            this.msgMap[serverId] = {};
        }

        this.msgMap[serverId][curId] = {
            moduleId: moduleId,
            msg: msg
        };

        let record = this.idMap[serverId];
        if (!record) {
            cb(new Error('unknown server id:' + serverId));
            return false;
        }

        this.sendToMonitor(record.socket, curId, moduleId, msg);

        return true;
    }

    /**
     * request server data from monitor by serverInfo{host:port}
     *
     * @param {String} serverId
     * @param {Object} serverInfo
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @param {Function} callback function
     * @api public
     */
    requestServer(serverId: string, serverInfo: ServerInfo, moduleId: string, msg: any, cb: Callback) {
        if (this.state > ST_STARTED) {
            return false;
        }

        let record = this.idMap[serverId];
        if (!record) {
            utils.invokeCallback(cb, new Error('unknown server id:' + serverId));
            return false;
        }

        let curId = this.reqId++;
        this.callbacks[curId] = cb;

        if (utils.compareServer(record.info as ServerInfo, serverInfo)) {
            this.sendToMonitor(record.socket, curId, moduleId, msg);
        } else {
            let slaves = this.slaveMap[serverId];
            for (let i = 0, l = slaves.length; i < l; i++) {
                if (utils.compareServer(slaves[i].info as ServerInfo, serverInfo)) {
                    this.sendToMonitor(slaves[i].socket, curId, moduleId, msg);
                    break;
                }
            }
        }

        return true;
    }

    /**
     * notify a monitor{master node} by id without callback
     *
     * @param {String} serverId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyById(serverId: string, moduleId: string, msg: any) {
        if (this.state > ST_STARTED) {
            return false;
        }

        let record = this.idMap[serverId];
        if (!record) {
            logger.error('fail to notifyById for unknown server id:' + serverId);
            return false;
        }

        this.sendToMonitor(record.socket, null, moduleId, msg);

        return true;
    }

    /**
     * notify a monitor by server{host:port} without callback
     *
     * @param {String} serverId
     * @param {Object} serverInfo{host:port}
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyByServer(serverId: string, serverInfo: ServerInfo, moduleId: string, msg: any) {
        if (this.state > ST_STARTED) {
            return false;
        }

        let record = this.idMap[serverId];
        if (!record) {
            logger.error('fail to notifyByServer for unknown server id:' + serverId);
            return false;
        }

        if (utils.compareServer(record.info as ServerInfo, serverInfo)) {
            this.sendToMonitor(record.socket, null, moduleId, msg);
        } else {
            let slaves = this.slaveMap[serverId];
            for (let i = 0, l = slaves.length; i < l; i++) {
                if (utils.compareServer(slaves[i].info as ServerInfo, serverInfo)) {
                    this.sendToMonitor(slaves[i].socket, null, moduleId, msg);
                    break;
                }
            }
        }
        return true;
    }

    /**
     * notify slaves by id without callback
     *
     * @param {String} serverId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifySlavesById(serverId: string, moduleId: string, msg: any) {
        if (this.state > ST_STARTED) {
            return false;
        }

        let slaves = this.slaveMap[serverId];
        if (!slaves || slaves.length === 0) {
            logger.error('fail to notifySlavesById for unknown server id:' + serverId);
            return false;
        }

        this.broadcastMonitors(slaves, moduleId, msg);
        return true;
    }

    /**
     * notify monitors by type without callback
     *
     * @param {String} type serverType
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyByType(type: string, moduleId: string, msg: any) {
        if (this.state > ST_STARTED) {
            return false;
        }

        let list = this.typeMap[type];
        if (!list || list.length === 0) {
            logger.error('fail to notifyByType for unknown server type:' + type);
            return false;
        }
        this.broadcastMonitors(list, moduleId, msg);
        return true;
    }

    /**
     * notify all the monitors without callback
     *
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyAll(moduleId: string, msg?: any) {
        if (this.state > ST_STARTED) {
            return false;
        }
        this.broadcastMonitors(this.idMap, moduleId, msg);
        return true;
    }

    /**
     * notify a client by id without callback
     *
     * @param {String} clientId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyClient(clientId: string, moduleId: string, msg: any) {
        if (this.state > ST_STARTED) {
            return false;
        }

        let record = this.clients[clientId];
        if (!record) {
            logger.error('fail to notifyClient for unknown client id:' + clientId);
            return false;
        }
        this.sendToClient(record.socket, null, moduleId, msg);
    }

    notifyCommand(command: string, moduleId: string, msg: any) {
        if (this.state > ST_STARTED) {
            return false;
        }
        this.broadcastCommand(this.idMap, command, moduleId, msg);
        return true;
    }
    doAuthUser(msg: AuthUserRequest, socket: MqttSocket, cb: Callback) {
        if (!msg.id) {
            // client should has a client id
            return cb(new Error('client should has a client id'));
        }

        let self = this;
        let username = msg.username;
        if (!username) {
            // client should auth with username
            this.doSend(socket, 'register', {
                code: protocol.PRO_FAIL,
                msg: 'client should auth with username'
            });
            return cb(new Error('client should auth with username'));
        }

        let authUser = self.consoleService.authUser;
        let env = self.consoleService.env;
        authUser(msg, env,  (user) => {
            if (!user) {
                // client should auth with username
                this.doSend(socket, 'register', {
                    code: protocol.PRO_FAIL,
                    msg: 'client auth failed with username or password error'
                });
                return cb(new Error('client auth failed with username or password error'));
            }

            if (self.clients[msg.id]) {
                this.doSend(socket, 'register', {
                    code: protocol.PRO_FAIL,
                    msg: 'id has been registered. id:' + msg.id
                });
                return cb(new Error('id has been registered. id:' + msg.id));
            }

            logger.info('client user : ' + username + ' login to master');
            this.addConnection(msg.id, msg.type, null, user, socket);
            this.doSend(socket, 'register', {
                code: protocol.PRO_OK,
                msg: 'ok'
            });

            cb();
        });
    }

    doAuthServer(msg: AuthServerRequest, socket: MqttSocket, cb: Callback) {
        let self = this;
        let authServer = self.consoleService.authServer;
        let env = self.consoleService.env;
        authServer(msg, env,  (status) => {
            if (status !== 'ok') {
                this.doSend(socket, 'register', {
                    code: protocol.PRO_FAIL,
                    msg: 'server auth failed'
                });
                cb(new Error('server auth failed'));
                return;
            }

            let record = this.addConnection(msg.id, msg.serverType, msg.pid, msg.info, socket);

            this.doSend(socket, 'register', {
                code: protocol.PRO_OK,
                msg: 'ok'
            });
            msg.info = msg.info;
            msg.info.pid = msg.pid;
            self.emit('register', msg.info);
            cb(null);
        });
    }

    /**
     * add monitor,client to connection -- idMap
     *
     * @param {Object} agent agent object
     * @param {String} id
     * @param {String} type serverType
     * @param {Object} socket socket-io object
     * @api private
     */
    addConnection(id: string, type: string, pid: string, info: AdminUserInfo | ServerInfo, socket: MqttSocket) {
        let record: AgentClient = {
            id: id,
            type: type,
            pid: pid,
            info: info,
            socket: socket
        };
        if (type === 'client') {
            this.clients[id] = record;
        } else {
            if (!this.idMap[id]) {
                this.idMap[id] = record;
                let list = this.typeMap[type] = this.typeMap[type] || [];
                list.push(record);
            } else {
                let slaves = this.slaveMap[id] = this.slaveMap[id] || [];
                slaves.push(record);
            }
        }
        return record;
    }

    /**
     * remove monitor,client connection -- idMap
     *
     * @param {Object} agent agent object
     * @param {String} id
     * @param {String} type serverType
     * @api private
     */
    removeConnection(id: string, type: string, info: ServerInfo) {
        if (type === 'client') {
            delete this.clients[id];
        } else {
            // remove master node in idMap and typeMap
            let record = this.idMap[id];
            if (!record) {
                return;
            }
            let _info = record['info']; // info {host, port}
            if (utils.compareServer(_info as ServerInfo, info)) {
                delete this.idMap[id];
                let list = this.typeMap[type];
                if (list) {
                    for (let i = 0, l = list.length; i < l; i++) {
                        if (list[i].id === id) {
                            list.splice(i, 1);
                            break;
                        }
                    }
                    if (list.length === 0) {
                        delete this.typeMap[type];
                    }
                }
            } else {
                // remove slave node in slaveMap
                let slaves = this.slaveMap[id];
                if (slaves) {
                    for (let i = 0, l = slaves.length; i < l; i++) {
                        if (utils.compareServer(slaves[i]['info'] as ServerInfo, info)) {
                            slaves.splice(i, 1);
                            break;
                        }
                    }
                    if (slaves.length === 0) {
                        delete this.slaveMap[id];
                    }
                }
            }
        }
    }

    /**
     * send msg to monitor
     *
     * @param {Object} socket socket-io object
     * @param {Number} reqId request id
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api private
     */
    sendToMonitor(socket: MqttSocket, reqId: number, moduleId: string, msg: any) {
        this.doSend(socket, 'monitor', protocol.composeRequest(reqId, moduleId, msg));
    }

    /**
     * send msg to client
     *
     * @param {Object} socket socket-io object
     * @param {Number} reqId request id
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api private
     */
    sendToClient(socket: MqttSocket, reqId: number, moduleId: string, msg: any) {
        this.doSend(socket, 'client', protocol.composeRequest(reqId, moduleId, msg));
    }

    doSend(socket: MqttSocket, topic: string, msg: any) {
        socket.send(topic, msg);
    }

    /**
     * broadcast msg to monitor
     *
     * @param {Object} record registered modules
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api private
     */
    broadcastMonitors(records: { [serverId: string]: AgentClient } | AgentClient[] , moduleId: string, msg: any) {
        msg = protocol.composeRequest(null, moduleId, msg);

        if (records instanceof Array) {
            for (let i = 0, l = records.length; i < l; i++) {
                let socket = records[i].socket;
                this.doSend(socket, 'monitor', msg);
            }
        } else {
            for (let id in records) {
                let record = (records as { [id: string]: AgentClient })[id];
                let socket = record.socket;
                this.doSend(socket, 'monitor', msg);
            }
        }
    }

    broadcastCommand(records:  AgentClient[] | { [id: string]: AgentClient }, command: string, moduleId: string, msg: any) {
        msg = protocol.composeCommand(null, command, moduleId, msg);

        if (records instanceof Array) {
            for (let i = 0, l = records.length; i < l; i++) {
                let socket = records[i].socket;
                this.doSend(socket, 'monitor', msg);
            }
        }
        else {
            for (let id in records) {
                let record = (records as { [id: string]: AgentClient })[id];
                let socket = record.socket;
                this.doSend(socket, 'monitor', msg);
            }
        }
    }
}