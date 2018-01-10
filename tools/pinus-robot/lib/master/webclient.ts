import * as __ from 'underscore';
import { Server } from './server';
import { NodeClient } from './nodeclient';

// WebClient is an end-user using a browser
export class WebClient {
  log_server: Server;
  socket: any;
  id: number;
  watching_logs: Array<any>;
  constructor(socket: any, server: Server) {
    this.log_server = server;
    this.socket = socket;
    this.id = socket.id;
    // Join web_clients room
    socket.join('web_clients');

    // Remove WebClient
    socket.on('disconnect', () => {
      __(this.watching_logs).each((log_file) => {
        log_file.remove_web_client(this);
      });
      socket.leave('web_clients');
    });
  }

  add_node(node: NodeClient) {
    this.socket.emit('add_node', {
      nodeId: node.nodeId,
      iport: node.iport
    });
  }

  // Tell WebClient to remove Node
  remove_node(node: NodeClient) {
    this.socket.emit('remove_node', {
      node: node.nodeId
    });
  }

  error_node(node: NodeClient, error: Error) {
    this.socket.emit('error', {
      node: node.iport,
      error: error
    });
  }
}