var __ = require('underscore');

// WebClient is an end-user using a browser
var WebClient = function(socket, server) {
  this.log_server = server;
  this.socket = socket;
  this.id = socket.id;
  var wc = this;

  // Join web_clients room
  socket.join('web_clients');

  // Remove WebClient 
  socket.on('disconnect', function() {
    __(wc.watching_logs).each(function(log_file) {
      log_file.remove_web_client(wc);
    });
    socket.leave('web_clients');
  });
};

WebClient.prototype = {

  // Tell WebClient to add new Node
  add_node: function(node) {
    this.socket.emit('add_node', {
      nodeId: node.nodeId,
      iport:node.iport
    });
  },

  // Tell WebClient to remove Node
  remove_node: function(node) {
    this.socket.emit('remove_node', {
      node: node.nodeId
    });
  },
  error_node: function(node,error) {
    this.socket.emit('error', {
      node: node.iport,
      error:error
    });
  }

};

module.exports = {
  WebClient: WebClient
};
