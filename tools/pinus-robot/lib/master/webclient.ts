import * as __ from "underscore";
import * as net from 'net';

// WebClient is an end-user using a browser
let WebClient = function(this:any, socket:any, server:net.Server) {
  this.log_server = server;
  this.socket = socket;
  this.id = socket.id;
  let wc = this;

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
  add_node: function(node:{nodeId:number,iport:number}) {
    this.socket.emit('add_node', {
      nodeId: node.nodeId,
      iport:node.iport
    });
  },

  // Tell WebClient to remove Node
  remove_node: function(node:{nodeId:number,iport:number}) {
    this.socket.emit('remove_node', {
      node: node.nodeId
    });
  },
  error_node: function(node:{nodeId:number,iport:number},error:Error) {
    this.socket.emit('error', {
      node: node.iport,
      error:error
    });
  }

};

module.exports = {
  WebClient: WebClient
};
