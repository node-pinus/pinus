import { EventEmitter } from 'events';
import * as util from 'util';
import * as utils from '../../util/utils';
import * as ws from 'ws';
import * as zlib from 'zlib';
import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', __filename);
import { Tracer } from '../../util/tracer';
import * as Coder from '../../util/coder';

let DEFAULT_ZIP_LENGTH = 1024 * 10;
let useZipCompress = false;

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
  doZipLength: number;
  useZipCompress: boolean;
}

export class WS2Acceptor extends EventEmitter {
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
  gid: number;

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
    this.gid = 1;
    DEFAULT_ZIP_LENGTH = opts.doZipLength || DEFAULT_ZIP_LENGTH;
    useZipCompress = opts.useZipCompress || false;
  }

  listen(port: any) {
    // check status
    if (!!this.inited) {
      this.cb(new Error('already inited.'));
      return;
    }
    this.inited = true;

    let self = this;

    this.server = new ws.Server({
      port
    });

    this.server.on('error', function (err: Error) {
      self.emit('error', err);
    });

    this.server.on('connection', function (socket: any) {
      let id = self.gid++;
      socket.id = id;
      self.sockets[id] = socket;

      self.emit('connection', {
        id: id,
        ip: socket._socket.remoteAddress
      });

      socket.on('message', function (data: any, flags: string) {
        try {
          // console.log("ws rpc server received message = " + data);
          let msg = data;
          msg = JSON.parse(msg);

          if (msg.body instanceof Array) {
            self.processMsgs(socket, self, msg.body);
          } else {
            self.processMsg(socket, self, msg.body);
          }
        } catch (e) {
          console.error('ws rpc server process message with error: %j', e.stack);
        }
      });

      socket.on('close', function (code: string, message: string) {
        delete self.sockets[id];
        delete self.msgQueues[id];
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
            sock.close();
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
      this.server.close();
    } catch (err) {
      console.error('rpc server close error: %j', err.stack);
    }
    this.emit('closed');
  }

  cloneError = function (origin: { msg: any, stack: Error }) {
    // copy the stack infos for Error instance json result is empty
    let res = {
      msg: origin.msg,
      stack: origin.stack
    };
    return res;
  };

  processMsg(socket: any, acceptor: WS2Acceptor, pkg: AcceptorPkg) {
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
        this.doSend(socket, resp);
      }
    });
  }

  processMsgs(socket: any, acceptor: WS2Acceptor, pkgs: Array<AcceptorPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(socket, acceptor, pkgs[i]);
    }
  }

  enqueue = function (socket: any, acceptor: WS2Acceptor, msg: Coder.Msg) {
    let queue = acceptor.msgQueues[socket.id];
    if (!queue) {
      queue = acceptor.msgQueues[socket.id] = [];
    }
    queue.push(msg);
  };

  flush(acceptor: WS2Acceptor) {
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
      this.doSend(socket, queue);
      //    socket.send(JSON.stringify({body: queue}));
      queues[socketId] = [];
    }
  }

  doSend(socket: any, dataObj: object) {
    let str = JSON.stringify({
      body: dataObj
    });
    // console.log("ws rpc server send str = " + str);
    // console.log("ws rpc server send str len = " + str.length);

    // console.log("ws rpc server send message, len = " + str.length);
    socket.send(str);
  }
}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
export function create(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
  return new WS2Acceptor(opts || <any>{}, cb);
}