import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'ws-acceptor');
import { EventEmitter } from 'events';
import { Tracer } from '../../util/tracer';
import * as utils from '../../util/utils';
import * as sio from 'socket.io';
import * as util from 'util';
import * as Coder from '../../util/coder';


export interface AcceptorPkg {
  source: string;
  remote: string;
  id: string & number;
  seq: number;
  msg: string;
}

export interface AcceptorOpts {
  interval: number;
  bufferMsg: any;
  rpcLogger: any;
  rpcDebugLog: any;
  whitelist: any;
}

export class WSAcceptor extends EventEmitter {
  interval: number; // flush interval in ms
  bufferMsg: any;
  rpcLogger: any;
  rpcDebugLog: any;
  whitelist: any;
  _interval: any; // interval object
  sockets: { [key: string]: any };
  msgQueues: { [key: string]: any };
  cb: any;
  inited: boolean;
  server: any;
  closed: boolean;

  constructor(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    super();
    this.bufferMsg = opts.bufferMsg;
    this.interval = opts.interval; // flush interval in ms
    this.rpcDebugLog = opts.rpcDebugLog;
    this.rpcLogger = opts.rpcLogger;
    this.whitelist = opts.whitelist;
    this._interval = null; // interval object
    this.sockets = {};
    this.msgQueues = {};
    this.cb = cb;
  }

  listen(port: string | number) {
    // check status
    if (!!this.inited) {
      this.cb(new Error('already inited.'));
      return;
    }
    this.inited = true;

    let self = this;

    this.server = sio.listen(port);

    this.server.set('log level', 0);

    this.server.server.on('error', function (err: Error) {
      logger.error('rpc server is error: %j', err.stack);
      self.emit('error', err);
    });

    this.server.sockets.on('connection', function (socket: any) {
      self.sockets[socket.id] = socket;

      self.emit('connection', {
        id: socket.id,
        ip: socket.handshake.address.address
      });

      socket.on('message', function (pkg: AcceptorPkg) {
        try {
          if (pkg instanceof Array) {
            self.processMsgs(socket, self, pkg);
          } else {
            self.processMsg(socket, self, pkg);
          }
        } catch (e) {
          // socke.io would broken if uncaugth the exception
          logger.error('rpc server process message error: %j', e.stack);
        }
      });

      socket.on('disconnect', function (reason: string) {
        delete self.sockets[socket.id];
        delete self.msgQueues[socket.id];
      });
    });

    this.on('connection', self.ipFilter.bind(this));

    if (this.bufferMsg) {
      this._interval = setInterval(function () {
        self.flush(self);
      }, this.interval);
    }
  }

  ipFilter(obj: any) {
    if (typeof this.whitelist === 'function') {
      let self = this;
      self.whitelist(function (err: Error, tmpList: Array<any>) {
        if (err) {
          logger.error('%j.(RPC whitelist).', err);
          return;
        }
        if (!Array.isArray(tmpList)) {
          logger.error('%j is not an array.(RPC whitelist).', tmpList);
          return;
        }
        if (!!obj && !!obj.ip && !!obj.id) {
          for (let i in tmpList) {
            let exp = new RegExp(tmpList[i]);
            if (exp.test(obj.ip)) {
              return;
            }
          }
          let sock = self.sockets[obj.id];
          if (sock) {
            sock.disconnect('unauthorized');
            logger.warn('%s is rejected(RPC whitelist).', obj.ip);
          }
        }
      });
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
      this.server.server.close();
    } catch (err) {
      logger.error('rpc server close error: %j', err.stack);
    }
    this.emit('closed');
  }

  cloneError(origin: { msg: any, stack: Error }) {
    // copy the stack infos for Error instance json result is empty
    let res = {
      msg: origin.msg,
      stack: origin.stack
    };
    return res;
  }

  processMsg(socket: any, acceptor: WSAcceptor, pkg: AcceptorPkg) {
    let tracer: Tracer = null;
    if (this.rpcDebugLog) {
      tracer = new Tracer(acceptor.rpcLogger, acceptor.rpcDebugLog, pkg.remote, pkg.source, pkg.msg, pkg.id, pkg.seq);
      tracer.info('server', __filename, 'processMsg', 'ws-acceptor receive message and try to process message');
    }
    acceptor.cb(tracer, pkg.msg, () => {
      // let args = arguments;
      let args = Array.prototype.slice.call(arguments, 0);
      let errorArg: { msg: any, stack: Error } = args[0]; // first callback argument can be error object, the others are message
      if (errorArg instanceof Error) {
        args[0] = this.cloneError(errorArg);
      }
      // for(let i=0, l=args.length; i<l; i++) {
      //   if(args[i] instanceof Error) {
      //     args[i] = cloneError(args[i]);
      //   }
      // }
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
        // resp = {id: pkg.id, resp: Array.prototype.slice.call(args, 0)};
      }
      if (acceptor.bufferMsg) {
        this.enqueue(socket, acceptor, resp);
      } else {
        socket.emit('message', resp);
      }
    });
  }

  processMsgs(socket: any, acceptor: WSAcceptor, pkgs: Array<AcceptorPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(socket, acceptor, pkgs[i]);
    }
  }

  enqueue(socket: any, acceptor: WSAcceptor, msg: Coder.Msg) {
    let queue = acceptor.msgQueues[socket.id];
    if (!queue) {
      queue = acceptor.msgQueues[socket.id] = [];
    }
    queue.push(msg);
  }

  flush(acceptor: WSAcceptor) {
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
      socket.emit('message', queue);
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
  return new WSAcceptor(opts || <any>{}, cb);
}