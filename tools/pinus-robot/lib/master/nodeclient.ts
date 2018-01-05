let __ = require('underscore');
import * as net from 'net'

// NodeClient is a server/machine/instance running a agent socket 
let NodeClient = function(this:any, nodeId:number, socket:any, server:net.Server) {
  this.nodeId = nodeId;
  this.socket = socket;
  this.iport = socket.handshake.address.address + ":" + socket.handshake.address.port;
  this.id = socket.id;
  this.log_server = server;
  let node = this;
 
  // Join 'nodes' room
  socket.join('nodes');

  socket.on('disconnect', function() {
    // Notify all WebClients upon disconnect
    __(node.log_server.web_clients).each(function(web_client:any, client_id:number) {
      web_client.remove_node(node);
    });
    socket.leave('nodes');
  });
}

module.exports = {
  NodeClient: NodeClient
}
