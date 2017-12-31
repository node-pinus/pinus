import { getLogger } from 'pinus-logger'
let logger = getLogger('pinus-rpc', 'mqtt2-mailbox');
import { EventEmitter } from 'events';
import { Tracer } from '../../util/tracer';
import * as utils from '../../util/utils';
let Composer: any = require('stream-pkg');
import * as util from 'util';
import * as net from 'net';
import { Msg } from '../../util/coder'

let DEFAULT_CALLBACK_TIMEOUT = 10 * 1000;
let DEFAULT_INTERVAL = 50;

export interface MailBoxPkg 
{
  id: string,
  topic: string,
  payload: any,
  resp: any;
  source: string;
  seq: number;
}

export interface MailBoxOpts 
{
  bufferMsg: any,
  keepalive: number,
  interval: number,
  timeout: number,
  context: any,
  pkgSize: number
}

export class TCPMailBox extends EventEmitter
{
  curId: number = 0;
  id: number;
  host: Function;
  port: string;
  requests: { [key: string]: any } = {};
  timeout: { [key: string]: any } = {};
  queue: Array<any> = [];
  bufferMsg: any;
  interval: number;
  timeoutValue: number;
  connected: boolean = false;
  closed: boolean = false;
  serverId: string;
  opts: any;
  socket: any = null;
  _interval: any;
  composer: any;

  constructor(server: { id: number, host: Function, port: string }, opts: MailBoxOpts)
  {
    super();
    this.opts = opts || <any>{};
    this.id = server.id;
    this.host = server.host;
    this.port = server.port;
    this.composer = new Composer({
      maxLength: opts.pkgSize
    });
    this.bufferMsg = opts.bufferMsg;
    this.interval = opts.interval || DEFAULT_INTERVAL;
    this.timeoutValue = opts.timeout || DEFAULT_CALLBACK_TIMEOUT;
  }

  connect(tracer: Tracer, cb: (tracer: Tracer, msg?: any, cb?: Function) => void)
  {
    tracer.info('client', __filename, 'connect', 'tcp-mailbox try to connect');
    if (this.connected)
    {
      utils.invokeCallback(cb, new Error('mailbox has already connected.'));
      return;
    }

    this.socket = net.connect(<any>{
      port: this.port,
      host: this.host
    }, function (err: Error)
    {
      // success to connect
      self.connected = true;
      if (self.bufferMsg)
      {
        // start flush interval
        self._interval = setInterval(function ()
        {
          self.flush(self);
        }, self.interval);
      }
      utils.invokeCallback(cb, err);
    });

    let self = this;

    this.composer.on('data', function (data: Object)
    {
      let pkg = JSON.parse(data.toString());
      if (pkg instanceof Array)
      {
        self.processMsgs(self, pkg);
      } else
      {
        self.processMsg(self, pkg);
      }
    });

    this.socket.on('data', function (data: object)
    {
      self.composer.feed(data);
    });

    this.socket.on('error', function (err: Error)
    {
      if (!self.connected)
      {
        utils.invokeCallback(cb, err);
        return;
      }
      self.emit('error', err, self);
    });

    this.socket.on('end', function ()
    {
      self.emit('close', self.id);
    });
    // TODO: reconnect and heartbeat
  };

  /**
 * close mailbox
 */
  close()
  {
    if (this.closed)
    {
      return;
    }
    this.closed = true;
    this.connected = false;
    if (this._interval)
    {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this.socket)
    {
      this.socket.end();
      this.socket = null;
    }
  };

  /**
   * send message to remote server
   *
   * @param msg {service:"", method:"", args:[]}
   * @param opts {} attach info to send method
   * @param cb declaration decided by remote interface
   */
  send(tracer: Tracer, msg: Msg, opts: MailBoxOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void)
  {
    tracer.info('client', __filename, 'send', 'tcp-mailbox try to send');
    if (!this.connected)
    {
      utils.invokeCallback(cb, new Error('not init.'));
      return;
    }

    if (this.closed)
    {
      utils.invokeCallback(cb, new Error('mailbox alread closed.'));
      return;
    }

    let id = this.curId++;
    this.requests[id] = cb;
    this.setCbTimeout(this, id, tracer, cb);
    let pkg: any;

    if (tracer.isEnabled)
    {
      pkg = {
        traceId: tracer.id,
        seqId: tracer.seq,
        source: tracer.source,
        remote: tracer.remote,
        id: id,
        msg: msg
      };
    } else
    {
      pkg = {
        id: id,
        msg: msg
      };
    }

    if (this.bufferMsg)
    {
      this.enqueue(this, pkg);
    } else
    {
      this.socket.write(this.composer.compose(JSON.stringify(pkg)));
    }
  };

  enqueue(mailbox: TCPMailBox, msg: Msg)
  {
    mailbox.queue.push(msg);
  };

  flush(mailbox: TCPMailBox)
  {
    if (mailbox.closed || !mailbox.queue.length)
    {
      return;
    }
    mailbox.socket.write(mailbox.composer.compose(JSON.stringify(mailbox.queue)));
    mailbox.queue = [];
  };

  processMsgs(mailbox: TCPMailBox, pkgs: Array<MailBoxPkg>)
  {
    for (let i = 0, l = pkgs.length; i < l; i++)
    {
      this.processMsg(mailbox, pkgs[i]);
    }
  };

  processMsg(mailbox: TCPMailBox, pkg: MailBoxPkg)
  {
    this.clearCbTimeout(mailbox, <any>pkg.id);
    let cb = mailbox.requests[pkg.id];
    if (!cb)
    {
      return;
    }
    delete mailbox.requests[pkg.id];

    let tracer = new Tracer(mailbox.opts.rpcLogger, mailbox.opts.rpcDebugLog, mailbox.opts.clientId, pkg.source, pkg.resp, pkg.id, pkg.seq);
    let args: Array<any> = [tracer, null];

    pkg.resp.forEach(function (arg: any)
    {
      args.push(arg);
    });

    cb.apply(null, args);
  };

  setCbTimeout(mailbox: TCPMailBox, id: number, tracer: Tracer, cb: (tracer: Tracer, msg?: any, cb?: Function) => void)
  {
    let timer = setTimeout(() =>
    {
      this.clearCbTimeout(mailbox, id);
      if (!!mailbox.requests[id])
      {
        delete mailbox.requests[id];
      }
      logger.error('rpc callback timeout, remote server host: %s, port: %s', mailbox.host, mailbox.port);
      utils.invokeCallback(cb, new Error('rpc callback timeout'));
    }, mailbox.timeoutValue);
    mailbox.timeout[id] = timer;
  };

  clearCbTimeout(mailbox: TCPMailBox, id: number)
  {
    if (!mailbox.timeout[id])
    {
      console.warn('timer not exists, id: %s', id);
      return;
    }
    clearTimeout(mailbox.timeout[id]);
    delete mailbox.timeout[id];
  };
}
/**
 * Factory method to create mailbox
 *
 * @param {Object} server remote server info {id:"", host:"", port:""}
 * @param {Object} opts construct parameters
 *                      opts.bufferMsg {Boolean} msg should be buffered or send immediately.
 *                      opts.interval {Boolean} msg queue flush interval if bufferMsg is true. default is 50 ms
 */
module.exports.create = function (server: { id: number, host: Function, port: string }, opts: MailBoxOpts)
{
  return new TCPMailBox(server, opts || <any>{});
};