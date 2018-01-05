import * as __ from "underscore";
import * as net from 'net';

// WebClient is an end-user using a browser
export class WebClient{
  log_server: net.Server;
  socket:any;
  id:number;
  watching_logs:Array<any>;
  constructor(socket: any, server: net.Server){
    this.log_server = server;
    this.socket = socket;
    this.id = socket.id;
    // Join web_clients room
  socket.join('web_clients');

  // Remove WebClient 
  socket.on('disconnect', () =>
  {
    __(this.watching_logs).each((log_file)=>
    {
      log_file.remove_web_client(this);
    });
    socket.leave('web_clients');
  });
  }

  add_node(node: { nodeId: number, iport: number })
  {
    this.socket.emit('add_node', {
      nodeId: node.nodeId,
      iport: node.iport
    });
  }

  // Tell WebClient to remove Node
  remove_node(node: { nodeId: number, iport: number })
  {
    this.socket.emit('remove_node', {
      node: node.nodeId
    });
  }

  error_node(node: { nodeId: number, iport: number }, error: Error)
  {
    this.socket.emit('error', {
      node: node.iport,
      error: error
    });
  }
}