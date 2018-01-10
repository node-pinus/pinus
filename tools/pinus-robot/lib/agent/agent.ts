let __ = require('underscore');
import * as io from 'socket.io-client';
import { logging, Logger } from '../common/logging';
import { Actor } from './actor';
let monitor = require('../monitor/monitor');
let fs = require('fs');
let util = require('../common/util');

let STATUS_INTERVAL = 10 * 1000; // 10 seconds
let RECONNECT_INTERVAL = 10 * 1000; // 15 seconds
let HEARTBEAT_PERIOD = 30 * 1000; // 30 seconds
let HEARTBEAT_FAILS = 3; // Reconnect after 3 missed heartbeats

export interface AgentCfg {
    master: {host: string, port: number, interval: number};
    script: string;
    scriptFile: string;
}
/**
 *
 * @param {Object} conf
 * init the master and app server for the agent
 * include app data, exec script,etc.
 *
 */
export class Agent {
    log: Logger = logging;
    conf: AgentCfg;
    last_heartbeat: any;
    connected: boolean;
    reconnecting: boolean;
    actors: { [key: string]: any };
    count: number;
    socket: SocketIOClient.Socket;
    nodeId: string;
    constructor(conf: AgentCfg) {
        this.log = logging;
        this.conf = conf || <AgentCfg>{};
        this.last_heartbeat = null;
        this.connected = false;
        this.reconnecting = false;
        this.actors = {};
        this.count = 0;
    }

    // Create socket, bind callbacks, connect to server

    connect() {
        let agent = this;
        let uri = 'http://' + agent.conf.master.host + ':' + agent.conf.master.port;
        console.log('connecting:' , uri);
        agent.socket = io.connect(uri, { forceNew: true, multiplex: false });
        agent.socket.on('error', function (reason: Error) {
            console.error('err:' , reason);
            agent.reconnect();
        });
        // Register announcement callback
        agent.socket.on('connect', function () {
            agent.log.info('Connected to server, sending announcement...');
            // console.log(agent.socket.socket.sessionid);
            // console.log(require('util').inspect(agent.socket.address,true,10,10));
            agent.announce(agent.socket);
            agent.connected = true;
            agent.reconnecting = false;
            agent.last_heartbeat = new Date().getTime();
        });

        agent.socket.on('disconnect', function () {
            agent.socket.disconnect();
            agent.log.error('Disconnect...');
        });
        // Server heartbeat
        agent.socket.on('heartbeat', function () {
            // agent.log.info("Received server heartbeat");
            agent.last_heartbeat = new Date().getTime();
            return;
        });

        // Node with same label already exists on server, kill process
        agent.socket.on('node_already_exists', function () {
            agent.log.error('ERROR: A node of the same name is already registered');
            agent.log.error('with the log server. Change this agent\'s instance_name.');
            agent.log.error('Exiting.');
            process.exit(1);
        });
        // begin to run
        agent.socket.on('run', function (message: { maxuser: any, script: string, index: number }) {
            agent.run(message);
        });
        // Exit for BTN_ReReady
        agent.socket.on('exit4reready', function () {
            agent.log.info('Exit for BTN_ReReady.');
            process.exit(0);
        });
    }

    run(msg: { maxuser: any, script: string, index: number }) {
        let agent = this;
        util.deleteLog();
        this.count = msg.maxuser;
        let script = msg.script;
        let index = msg.index;

        let conf = {} as AgentCfg;
        conf.master = agent.conf.master;
        conf.scriptFile = agent.conf.scriptFile;

        if (!!script && script.length > 1) {
            conf.script = script;
        }
        agent.log.info(this.nodeId + ' run ' + this.count + ' actors ');
        monitor.clear();
        this.actors = {};
        let offset = index * this.count;
        for (let i = 0; i < this.count; i++) {
            let aid = i + offset; // calc database key offset;
            let actor = new Actor(conf, aid);
            this.actors[aid] = actor;
            (function (actor) {
                actor.on('error', function (error: Error) {
                    agent.socket.emit('error', error);
                });
                if (conf.master.interval <= 0) {
                    actor.run();
                } else {
                    let time = Math.round(Math.random() * 1000 + i * conf.master.interval);
                    setTimeout(function () {
                        actor.run();
                    }, time);
                }
            })(actor);
        }
        setInterval(function () {
            let mdata = monitor.getData();
            agent.socket.emit('report', mdata);
        }, STATUS_INTERVAL);
    }

    // Run agent
    start() {
        let agent = this;
        agent.connect();
        // Check for heartbeat every HEARTBEAT_PERIOD, reconnect if necessary
        setInterval(function () {
            let delta = ((new Date().getTime()) - agent.last_heartbeat);
            if (delta > (HEARTBEAT_PERIOD * HEARTBEAT_FAILS)) {
                agent.log.warn('Failed heartbeat check, reconnecting...');
                agent.connected = false;
                agent.reconnect();
            }
        }, HEARTBEAT_PERIOD);
    }

    // Sends announcement
    announce(socket: any) {
        let agent = this;
        let sessionid = agent.socket.id;
        agent.nodeId = sessionid;
        this._send('announce_node', {
            client_type: 'node',
            nodeId: sessionid
        });
    }

    // Reconnect helper, retry until connection established
    reconnect(force?: any) {
        let agent = this;
        if (!force && agent.reconnecting) { return; }
        this.reconnecting = true;
        if (agent.socket != null) {
            agent.socket.disconnect();
            agent.connected = false;
        }
        console.log('Reconnecting to server...');
        setTimeout(function () {
            if (agent.connected) { return; }
            agent.connect();
        }, RECONNECT_INTERVAL);
    }

    _send(event: string, message: {
        client_type: string,
        nodeId: string
    }) {
        try {
            this.socket.emit(event, message);
            // If server is down, a non-writeable stream error is thrown.
        } catch (err) {
            this.log.error('ERROR: Unable to send message over socket.');
            this.connected = false;
            this.reconnect();
        }
    }
}

