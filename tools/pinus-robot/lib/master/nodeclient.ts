import * as __ from 'underscore';
import { Server } from './server';

// NodeClient is a server/machine/instance running a agent socket
export class NodeClient {
  nodeId: number;
  socket: any;
  iport: string;
  id: string;
  log_server: Server;
  constructor(nodeId: number, socket: SocketIO.Socket, server: Server) {
    this.nodeId = nodeId;
    this.socket = socket;
    this.iport = socket.handshake.address;
    this.id = socket.id;
    this.log_server = server;

    // Join 'nodes' room
    socket.join('nodes');

    socket.on('disconnect', () => {
      // Notify all WebClients upon disconnect
      __(this.log_server.web_clients).each((web_client: any, client_id: number) => {
        web_client.remove_node(this);
      });
      socket.leave('nodes');
    });
  }
}