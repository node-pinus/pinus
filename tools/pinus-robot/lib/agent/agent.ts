let __ = require('underscore');
let io = require('socket.io-client');
let logging = require('../common/logging').Logger;
import {Actor} from './actor'
let monitor  = require('../monitor/monitor');
let fs = require('fs');
let util = require('../common/util');

let STATUS_INTERVAL = 10 * 1000; // 10 seconds
let RECONNECT_INTERVAL = 10 * 1000; // 15 seconds
let HEARTBEAT_PERIOD = 30 * 1000; // 30 seconds
let HEARTBEAT_FAILS = 3; // Reconnect after 3 missed heartbeats

/**
 * 
 * @param {Object} conf 
 * init the master and app server for the agent
 * include app data, exec script,etc.
 *
 */
 let Agent = function(this:any, conf: any) {
    this.log = logging;
    this.conf = conf || {};
    this.last_heartbeat = null;
    this.connected = false;
    this.reconnecting = false;
    this.actors = {};
    this.count = 0;
};

Agent.prototype = {
    // Create socket, bind callbacks, connect to server
    connect: function() {
        let agent = this;
        let uri = agent.conf.master.host + ":" + agent.conf.master.port;    
        agent.socket = io.connect(uri,{'force new connection':true,'try multiple transports':false});
        agent.socket.on('error', function(reason: Error) {
            agent.reconnect();
        });
        // Register announcement callback
        agent.socket.on('connect', function() {
            agent.log.info("Connected to server, sending announcement...");
            //console.log(agent.socket.socket.sessionid);
            //console.log(require('util').inspect(agent.socket.address,true,10,10));
            agent.announce(agent.socket);
            agent.connected = true;
            agent.reconnecting = false;
            agent.last_heartbeat = new Date().getTime();
        });

        agent.socket.on('disconnect', function() {
            agent.socket.disconnect();
            agent.log.error("Disconnect...");
        });
        // Server heartbeat
        agent.socket.on('heartbeat', function() {
            //agent.log.info("Received server heartbeat");
            agent.last_heartbeat = new Date().getTime();
            return;
        });

        // Node with same label already exists on server, kill process
        agent.socket.on('node_already_exists', function() {
            agent.log.error("ERROR: A node of the same name is already registered");
            agent.log.error("with the log server. Change this agent's instance_name.");
            agent.log.error("Exiting.");
            process.exit(1);
        });
        //begin to run
        agent.socket.on('run', function(message: string) {
            agent.run(message);
        });
        // Exit for BTN_ReReady
        agent.socket.on('exit4reready', function() {
          agent.log.info("Exit for BTN_ReReady.");
          process.exit(0);
        });
    },
    
    run:function(msg: {maxuser:any, script:Array<any>, index:number}){
        let agent = this;
        util.deleteLog();
        this.count = msg.maxuser;
        let script = msg.script;
        let index = msg.index;
        if (!!script && script.length>1){
            agent.conf.script = script;
        } 
        agent.log.info(this.nodeId + ' run ' + this.count + ' actors ');
        monitor.clear();
        this.actors = {};
        let offset = index*this.count;
        for (let i = 0;i < this.count;i++) {
           let aid = i+offset; //calc database key offset;
           let actor = new Actor(agent.conf,aid);
           this.actors[aid]= actor;
           (function(actor){
            actor.on('error',function(error: Error){
             agent.socket.emit('error',error);
            });
           if (agent.conf.master.interval<=0) {
                actor.run();
            } else {
                let time = Math.round(Math.random()*1000+ i*agent.conf.master.interval);
                    setTimeout(function(){
                        actor.run();
                    },time);
                }
            })(actor);
       };
       setInterval(function(){
          let mdata = monitor.getData();
          agent.socket.emit('report',mdata);
      },STATUS_INTERVAL);
   },

    // Run agent
    start: function() {
        let agent = this;
        agent.connect();
        // Check for heartbeat every HEARTBEAT_PERIOD, reconnect if necessary
        setInterval(function() {
            let delta = ((new Date().getTime()) - agent.last_heartbeat);
            if (delta > (HEARTBEAT_PERIOD * HEARTBEAT_FAILS)) {
                agent.log.warn("Failed heartbeat check, reconnecting...");
                agent.connected = false;
                agent.reconnect();
            }
        }, HEARTBEAT_PERIOD);
    },
    // Sends announcement 
    announce: function(socket: any) {
     let agent = this;
     let sessionid = agent.socket.socket.sessionid;
     agent.nodeId = sessionid;
         this._send('announce_node', {
            client_type:'node',
            nodeId:sessionid
        });
    },

    // Reconnect helper, retry until connection established
    reconnect: function(force:any) {
        let agent = this;
        if (!force && agent.reconnecting) { return; }
        this.reconnecting = true;
        if (agent.socket!=null){
            agent.socket.disconnect();
            agent.connected = false;
        }
        agent.log.info("Reconnecting to server...");
        setTimeout(function() {
            if (agent.connected) { return; }
            agent.connect();
        }, RECONNECT_INTERVAL);
    },
    _send: function(event: string, message: string) {
        try {
            this.socket.emit(event, message);
            // If server is down, a non-writeable stream error is thrown.
        } catch(err) {
            this.log.error("ERROR: Unable to send message over socket.");
            this.connected = false;
            this.reconnect();
        }
    }
};

exports.Agent = Agent;
