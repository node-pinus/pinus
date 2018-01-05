var io = require('socket.io');
var __ = require('underscore');
var _nodeclient = require('./nodeclient.js');
var _wc = require('./webclient.js');
var logging = require('../common/logging').Logger;
var stat  = require('../monitor/stat');
var starter = require('./starter');

var STATUS_INTERVAL = 60 * 1000; // 60 seconds
var HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
var STATUS_IDLE = 0;
var STATUS_READY = 1;
var STATUS_RUNNING = 2;
var STATUS_DISCONN = 3;
/**
 *
 * robot master instance
 *
 * @param {Object} conf
 *
 * conf.main client run file
 */ 
 var Server = function(conf) {
   this.log = logging;
   this.nodes = {};
   this.web_clients = {};
   this.conf = conf || {};
   this.runconfig = null;
   this.status = STATUS_IDLE;
   var rserver = this;

   setInterval(function() {
    rserver.log.info("Nodes: " + __(rserver.nodes).size() + ", " +
      "WebClients: " + __(rserver.web_clients).size());  
}, STATUS_INTERVAL);
};

Server.prototype = {

    listen: function(port) {
        this.io = io.listen(port);
        this.register();
    },
    // Registers new Node with Server, announces to WebClients
    announce_node: function(socket, message) {
        var rserver = this,nodeId = message.nodeId;
        if (!!rserver.nodes[nodeId]) {
            this.log.warn("Warning: Node '" + nodeId + "' already exists, delete old items ");
            socket.emit('node_already_exists');
            delete rserver.nodes[nodeId];
        }

        var node = new _nodeclient.NodeClient(nodeId,socket, this);
        rserver.nodes[nodeId] = node;

        __(rserver.web_clients).each(function(web_client) {
            web_client.add_node(node);
        });

        socket.on('disconnect', function() {
            delete rserver.nodes[nodeId];
            __(rserver.web_clients).each(function(web_client) {
                web_client.remove_node(node);
            });
            if (__.size(rserver.nodes)<=0){
                rserver.status = STATUS_IDLE;
            }
            stat.clear(nodeId);
        });
        
        socket.on('report', function(message) {
            stat.merge(nodeId,message);
        });

        /* temporary code */
        socket.on('error', function(message) {
             __(rserver.web_clients).each(function(web_client) {
                web_client.error_node(node,message);
            });
        });
        socket.on('crash', function(message) {
             __(rserver.web_clients).each(function(web_client) {
                web_client.error_node(node,message);
            });
            rserver.status = STATUS_READY;
        });
        /* temporary code */
    },
    // Registers new WebClient with Server
    announce_web_client: function(socket) {
        var rserver = this;
        var web_client = new _wc.WebClient(socket, rserver);
        rserver.web_clients[web_client.id] = web_client;
        __(rserver.nodes).each(function(node, nlabel) {
            web_client.add_node(node);
        });
        setInterval(function(){
          rserver.io.sockets.in('web_clients').emit('statusreport',{status:rserver.status});
      },STATUS_INTERVAL/10);
        socket.on('webreport', function(message) {
            if (rserver.status==STATUS_RUNNING) {
           socket.emit('webreport',rserver.runconfig.agent,rserver.runconfig.maxuser,stat.getTimeData(rserver),stat.getCountData());
       }
   });

        socket.on('detailreport', function(message) {
          if (rserver.status==STATUS_RUNNING) {
           socket.emit('detailreport',stat.getDetails());
       }
   });

        socket.on('disconnect', function() {
            delete rserver.web_clients[web_client.id];
        });

    },

    // Register announcement, disconnect callbacks
    register: function() {
        var rserver = this;
        rserver.io.set('log level', 1); 
        rserver.io.sockets.on('connection', function(socket) {
            socket.on('announce_node', function(message) {
                rserver.log.info("Registering new node " + JSON.stringify(message));
                rserver.announce_node(socket, message);
            });
            socket.on('announce_web_client', function(message) {
                rserver.log.info("Registering new web_client");
                rserver.announce_web_client(socket);
                socket.on('run', function(msg) {
                    stat.clear();
                    msg.agent = __.size(rserver.nodes);
                    console.log('server begin notify client to run machine...');
                    rserver.runconfig = msg;
                    var i = 0;
                    __.each(rserver.nodes,function(ele){
                        //console.log(i++);
                        msg.index = i++;
                        ele.socket.emit('run',msg);
                    });
                    //rserver.io.sockets.in('nodes').emit('run',msg);
                    rserver.status = STATUS_RUNNING;
                    return ;
                });
                socket.on('ready', function(msg) {
                    console.log('server begin ready client ...');
                    rserver.io.sockets.in('nodes').emit('disconnect',{});
                    stat.clear();
                    rserver.status = STATUS_READY;
                    rserver.runconfig = msg;
                    starter.run(rserver.conf.mainFile,msg,rserver.conf.clients);
                    return;
                });

                socket.on('exit4reready', function() {
                  __.each(rserver.nodes, function(obj){
                    obj.socket.emit('exit4reready');
                  });
                  rserver.nodes = {};
                  return ;
                });

            });
        });

        // Broadcast heartbeat to all clients
        setInterval(function() {
            rserver.io.sockets.emit('heartbeat');
        }, HEARTBEAT_INTERVAL); 
    }
};

exports.Server = Server;
