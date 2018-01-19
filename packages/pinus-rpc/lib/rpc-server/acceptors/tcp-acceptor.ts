import { EventEmitter } from 'events';
import { Tracer } from '../../util/tracer';
import * as utils from '../../util/utils';
let Composer: any = require('stream-pkg');
import * as util from 'util';
import * as net from 'net';
import * as Coder from '../../util/coder';
import {AcceptorOpts} from '../acceptor';


export interface AcceptorPkg {
  source: string;
  remote: string;
  id: string & number;
  seq: number;
  msg: string;
}



export class TCPAcceptor extends EventEmitter {
  bufferMsg: any;
  interval: number; // flush interval in ms
  pkgSize: number;
  _interval: any; // interval object
  server: any;
  rpcLogger: any;
  rpcDebugLog: any;
  sockets: { [key: string]: any } = {};
  msgQueues: { [key: string]: any } = {};
  cb: (tracer: any, msg?: any, cb?: Function) => void;
  inited: boolean;
  closed: boolean;

  constructor(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    super();
    this.bufferMsg = opts.bufferMsg;
    this.interval = opts.interval; // flush interval in ms
    this.pkgSize = opts.pkgSize;
    this.rpcLogger = opts.rpcLogger;
    this.rpcDebugLog = opts.rpcDebugLog;
    this._interval = null; // interval object
    this.server = null;
    this.sockets = {};
    this.msgQueues = {};
    this.cb = cb;
  }

  listen(port: string | number) {
    // check status
    if (!!this.inited) {
      utils.invokeCallback(this.cb, new Error('already inited.'));
      return;
    }
    this.inited = true;

    let self = this;

    this.server = net.createServer();
    this.server.listen(port);

    this.server.on('error', function (err: Error) {
      self.emit('error', err, self);
    });

    this.server.on('connection', function (socket: any) {
      self.sockets[socket.id] = socket;
      socket.composer = new Composer({
        maxLength: self.pkgSize
      });

      socket.on('data', function (data: any) {
        socket.composer.feed(data);
      });

      socket.composer.on('data', function (data: any) {
        let pkg = JSON.parse(data.toString());
        if (pkg instanceof Array) {
          self.processMsgs(socket, pkg);
        } else {
          self.processMsg(socket, pkg);
        }
      });

      socket.on('close', function () {
        delete self.sockets[socket.id];
        delete self.msgQueues[socket.id];
      });
    });

    if (this.bufferMsg) {
      this._interval = setInterval(function () {
        self.flush(self);
      }, this.interval);
    }
  }

  close() {
    if (!!this.closed) {
      return;
    }
    this.closed = true;
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    try {
      this.server.close();
    } catch (err) {
      console.error('rpc server close error: %j', err.stack);
    }
    this.emit('closed');
  }

  cloneError(origin: { msg: any, stack: any }) {
    // copy the stack infos for Error instance json result is empty
    let res = {
      msg: origin.msg,
      stack: origin.stack
    };
    return res;
  }

  processMsg(socket: any, pkg: AcceptorPkg) {
      let tracer: Tracer = null;
      if(this.rpcDebugLog){
          tracer = new Tracer(this.rpcLogger, this.rpcDebugLog, pkg.remote, pkg.source, pkg.msg, pkg.id, pkg.seq);
          tracer.info('server', __filename, 'processMsg', 'tcp-acceptor receive message and try to process message');
      }
      this.cb(tracer, pkg.msg, (... args: any[]) => {
      // let args = Array.prototype.slice.call(arguments, 0);
      // for (let i = 0, l = args.length; i < l; i++) {
      //   if (args[i] instanceof Error) {
      //     args[i] = this.cloneError(args[i]);
      //   }
      // }
        let errorArg = args[0]; // first callback argument can be error object, the others are message
        if (errorArg && errorArg instanceof Error) {
            args[0] = this.cloneError(<any>errorArg);
        }

        let resp: any;
      if (tracer && tracer.isEnabled) {
        resp = {
          traceId: tracer.id,
          seqId: tracer.seq,
          source: tracer.source,
          id: pkg.id,
          resp: args
        };
      } else {
        resp = {
          id: pkg.id,
          resp: args
        };
      }
      if (this.bufferMsg) {
        this.enqueue(socket, resp);
      } else {
        socket.write(socket.composer.compose(JSON.stringify(resp)));
      }
    });
  }

  processMsgs(socket: any, pkgs: Array<AcceptorPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(socket, pkgs[i]);
    }
  }

  enqueue(socket: any, msg: Coder.Msg) {
    let queue = this.msgQueues[socket.id];
    if (!queue) {
      queue = this.msgQueues[socket.id] = [];
    }
    queue.push(msg);
  }

  flush(acceptor: TCPAcceptor) {
    let sockets = acceptor.sockets,
      queues = acceptor.msgQueues,
      queue, socket;
    for (let socketId in queues) {
      socket = sockets[socketId];
      if (!socket) {
        // clear pending messages if the socket not exist any more
        delete queues[socketId];
        continue;
      }
      queue = queues[socketId];
      if (!queue.length) {
        continue;
      }
      socket.write(socket.composer.compose(JSON.stringify(queue)));
      queues[socketId] = [];
    }
  }
}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
export function create(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
  return new TCPAcceptor(opts || <any>{}, cb);
}

process.on('SIGINT', function () {
  process.exit();
});