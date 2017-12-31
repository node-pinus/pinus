import { EventEmitter } from 'events';
import { Tracer } from '../../util/tracer';
import * as utils from '../../util/utils';
let Composer: any = require('stream-pkg');
import * as util from 'util';
import * as net from 'net';
import * as Coder from '../../util/coder';


export interface AcceptorPkg 
{
  source: string;
  remote: string;
  id: string & number;
  seq: number;
  msg: string;
}

export interface AcceptorOpts 
{
  interval: number,
  bufferMsg: any,
  pkgSize: any,
  rpcLogger: any,
  rpcDebugLog: any,
}

export class TCPAcceptor extends EventEmitter
{
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
  closed: boolean

  constructor(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void)
  {
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

  listen(port: string | number)
  {
    //check status
    if (!!this.inited)
    {
      utils.invokeCallback(this.cb, new Error('already inited.'));
      return;
    }
    this.inited = true;

    let self = this;

    this.server = net.createServer();
    this.server.listen(port);

    this.server.on('error', function (err: Error)
    {
      self.emit('error', err, self);
    });

    this.server.on('connection', function (socket: any)
    {
      self.sockets[socket.id] = socket;
      socket.composer = new Composer({
        maxLength: self.pkgSize
      });

      socket.on('data', function (data: any)
      {
        socket.composer.feed(data);
      });

      socket.composer.on('data', function (data: any)
      {
        let pkg = JSON.parse(data.toString());
        if (pkg instanceof Array)
        {
          self.processMsgs(socket, self, pkg);
        } else
        {
          self.processMsg(socket, self, pkg);
        }
      });

      socket.on('close', function ()
      {
        delete self.sockets[socket.id];
        delete self.msgQueues[socket.id];
      });
    });

    if (this.bufferMsg)
    {
      this._interval = setInterval(function ()
      {
        self.flush(self);
      }, this.interval);
    }
  };

  close()
  {
    if (!!this.closed)
    {
      return;
    }
    this.closed = true;
    if (this._interval)
    {
      clearInterval(this._interval);
      this._interval = null;
    }
    try
    {
      this.server.close();
    } catch (err)
    {
      console.error('rpc server close error: %j', err.stack);
    }
    this.emit('closed');
  };

  cloneError(origin: { msg: any, stack: any })
  {
    // copy the stack infos for Error instance json result is empty
    let res = {
      msg: origin.msg,
      stack: origin.stack
    };
    return res;
  };

  processMsg(socket: any, acceptor: TCPAcceptor, pkg: AcceptorPkg)
  {
    let tracer = new Tracer(acceptor.rpcLogger, acceptor.rpcDebugLog, pkg.remote, pkg.source, pkg.msg, pkg.id, pkg.seq);
    tracer.info('server', __filename, 'processMsg', 'tcp-acceptor receive message and try to process message');
    acceptor.cb(tracer, pkg.msg, () =>
    {
      let args = Array.prototype.slice.call(arguments, 0);
      for (let i = 0, l = args.length; i < l; i++)
      {
        if (args[i] instanceof Error)
        {
          args[i] = this.cloneError(args[i]);
        }
      }
      let resp:any;
      if (tracer.isEnabled)
      {
        resp = {
          traceId: tracer.id,
          seqId: tracer.seq,
          source: tracer.source,
          id: pkg.id,
          resp: Array.prototype.slice.call(args, 0)
        };
      } else
      {
        resp = {
          id: pkg.id,
          resp: Array.prototype.slice.call(args, 0)
        };
      }
      if (acceptor.bufferMsg)
      {
        this.enqueue(socket, acceptor, resp);
      } else
      {
        socket.write(socket.composer.compose(JSON.stringify(resp)));
      }
    });
  };

  processMsgs(socket: any, acceptor: TCPAcceptor, pkgs: Array<AcceptorPkg>)
  {
    for (let i = 0, l = pkgs.length; i < l; i++)
    {
      this.processMsg(socket, acceptor, pkgs[i]);
    }
  };

  enqueue(socket: any, acceptor: TCPAcceptor, msg: Coder.Msg)
  {
    let queue = acceptor.msgQueues[socket.id];
    if (!queue)
    {
      queue = acceptor.msgQueues[socket.id] = [];
    }
    queue.push(msg);
  };

  flush(acceptor: TCPAcceptor)
  {
    let sockets = acceptor.sockets,
      queues = acceptor.msgQueues,
      queue, socket;
    for (let socketId in queues)
    {
      socket = sockets[socketId];
      if (!socket)
      {
        // clear pending messages if the socket not exist any more
        delete queues[socketId];
        continue;
      }
      queue = queues[socketId];
      if (!queue.length)
      {
        continue;
      }
      socket.write(socket.composer.compose(JSON.stringify(queue)));
      queues[socketId] = [];
    }
  };
}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
export function create(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void)
{
  return new TCPAcceptor(opts || <any>{}, cb);
};

process.on('SIGINT', function ()
{
  process.exit();
});