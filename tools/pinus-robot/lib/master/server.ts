import * as io from 'socket.io';
import * as __ from 'underscore';
import * as  _nodeclient from './nodeclient.js';
import * as  _wc from './webclient.js';
import { logging, Logger } from '../common/logging';
import * as  stat from '../monitor/stat';
import * as  starter from './starter';

let STATUS_INTERVAL = 60 * 1000; // 60 seconds
let HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
let STATUS_IDLE = 0;
let STATUS_READY = 1;
let STATUS_RUNNING = 2;
let STATUS_DISCONN = 3;

export interface ServerCfg {
    clients: Array<any>;
    mainFile: string;
    master: { [key: string]: any };
    scriptFile: string;
    script: Array<any>;
}

/**
 *
 * robot master instance
 *
 * @param {Object} conf
 *
 * conf.main client run file
 */
export class Server {
    log: Logger;
    nodes: { [key: string]: any } = {};
    web_clients: { [key: string]:  _wc.WebClient } = {};
    conf: ServerCfg;
    runconfig = { maxuser: 1, agent: 1 };
    status: number = STATUS_RUNNING;
    io: SocketIO.Server;
    constructor(conf: ServerCfg) {
        this.log = logging;
        this.conf = conf || {} as ServerCfg;
        setInterval(() => {
            this.log.info('Nodes: ' + __(this.nodes).size() + ', ' +
                'WebClients: ' + __(this.web_clients).size());
        }, STATUS_INTERVAL);
    }

    listen(port: number | string) {
        this.io = io.listen(port);
        this.register();
    }
    // Registers new Node with Server, announces to WebClients
    announce_node(socket: SocketIO.Socket, message: any) {
        let rserver = this, nodeId = message.nodeId;
        if (!!rserver.nodes[nodeId]) {
            this.log.warn('Warning: Node \'' + nodeId + '\' already exists, delete old items ');
            socket.emit('node_already_exists');
            delete rserver.nodes[nodeId];
        }
        else {
            this.log.warn('reg: Node \'' + nodeId + '\' ');
        }

        let node = new _nodeclient.NodeClient(nodeId, socket, this);
        rserver.nodes[nodeId] = node;

        __(rserver.web_clients).each(function (web_client) {
            web_client.add_node(node);
        });

        socket.on('disconnect', function () {
            delete rserver.nodes[nodeId];
            __(rserver.web_clients).each(function (web_client) {
                web_client.remove_node(node);
            });
            if (__.size(rserver.nodes) <= 0) {
                rserver.status = STATUS_IDLE;
            }
            stat.clear(nodeId);
        });

        socket.on('report', function (message: string) {
            stat.merge(nodeId, message);
        });

        /* temporary code */
        socket.on('error', function (message: Error) {
            __(rserver.web_clients).each(function (web_client) {
                web_client.error_node(node, message);
            });
        });
        socket.on('crash', function (message: Error) {
            __(rserver.web_clients).each(function (web_client) {
                web_client.error_node(node, message);
            });
            rserver.status = STATUS_READY;
        });
        /* temporary code */
    }
    // Registers new WebClient with Server
    announce_web_client(socket: SocketIO.Socket) {
        let rserver = this;
        let web_client = new _wc.WebClient(socket, rserver);
        rserver.web_clients[web_client.id] = web_client;
        __(rserver.nodes).each(function (node, nlabel) {
            web_client.add_node(node);
        });
        setInterval(function () {
            rserver.io.sockets.in('web_clients').emit('statusreport', { status: rserver.status });
        }, STATUS_INTERVAL / 10);
        socket.on('webreport', function (message: string) {
            if (rserver.status === STATUS_RUNNING) {
                socket.emit('webreport', rserver.runconfig.agent, rserver.runconfig.maxuser, stat.getTimeData(), stat.getCountData());
            }
        });

        socket.on('detailreport', function (message: string) {
            if (rserver.status === STATUS_RUNNING) {
                socket.emit('detailreport', stat.getDetails());
            }
        });

        socket.on('disconnect', function () {
            delete rserver.web_clients[web_client.id];
        });
    }

    // Register announcement, disconnect callbacks
    register() {
        let rserver = this;
        // rserver.io.set('log level', 1);
        rserver.io.sockets.on('connection', function (socket) {
            socket.on('announce_node', function (message: string) {
                rserver.log.info('Registering new node ' + JSON.stringify(message));
                rserver.announce_node(socket, message);
            });
            socket.on('announce_web_client', function (message: string) {
                rserver.log.info('Registering new web_client');
                rserver.announce_web_client(socket);
                socket.on('run', function (msg: any) {
                    stat.clear();
                    msg.agent = __.size(rserver.nodes);
                    console.log('server begin notify client to run machine...');
                    rserver.runconfig = msg;
                    let i = 0;
                    __.each(rserver.nodes, function (ele) {
                        // console.log(i++);
                        msg.index = i++;
                        ele.socket.emit('run', msg);
                    });
                    // rserver.io.sockets.in('nodes').emit('run',msg);
                    rserver.status = STATUS_RUNNING;
                    return;
                });
                socket.on('ready', function (msg: any) {
                    console.log('server begin ready client ...');
                    rserver.io.sockets.in('nodes').emit('disconnect', {});
                    stat.clear();
                    rserver.status = STATUS_READY;
                    rserver.runconfig = msg;
                    starter.run(rserver.conf.mainFile, msg, rserver.conf.clients);
                    return;
                });

                socket.on('exit4reready', function () {
                    __.each(rserver.nodes, function (obj: { socket: SocketIO.Socket }) {
                        obj.socket.emit('exit4reready');
                    });
                    rserver.nodes = {};
                    return;
                });

            });
        });

        // Broadcast heartbeat to all clients
        setInterval(function () {
            rserver.io.sockets.emit('heartbeat');
        }, HEARTBEAT_INTERVAL);
    }
}