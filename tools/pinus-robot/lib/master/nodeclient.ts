var __ = require('underscore');

// NodeClient is a server/machine/instance running a agent socket 
var NodeClient = function(nodeId, socket, server) {
  this.nodeId = nodeId;
  this.socket = socket;
  this.iport = socket.handshake.address + ":" + nodeId;
  this.id = socket.id;
  this.log_server = server;
  var node = this;
 
  // Join 'nodes' room
  socket.join('nodes');

  socket.on('disconnect', function() {
    // Notify all WebClients upon disconnect
    __(node.log_server.web_clients).each(function(web_client, client_id) {
      web_client.remove_node(node);
    });
    socket.leave('nodes');
  });
}

module.exports = {
  NodeClient: NodeClient
}
