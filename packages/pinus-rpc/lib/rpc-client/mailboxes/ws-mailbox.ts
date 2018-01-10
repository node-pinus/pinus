import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'ws-mailbox');
import { EventEmitter } from 'events';
import { constants } from '../../util/constants';
import { Tracer } from '../../util/tracer';
import * as client from 'socket.io-client';
import * as utils from '../../util/utils';
import * as util from 'util';
import { Msg } from '../../util/coder';

export interface MailBoxPkg {
  id: string;
  topic: string;
  payload: any;
  resp: any;
  source: string;
  seq: number;
}

export interface MailBoxOpts {
  bufferMsg: any;
  keepalive: number;
  interval: number;
  timeout: number;
  context: any;
  pkgSize: number;
}

export class WSMailBox extends EventEmitter {
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
  opts: any;
  socket: any;
  _interval: any;

  constructor(server: { id: number, host: Function, port: string }, opts: MailBoxOpts) {
    super();
    this.id = server.id;
    this.host = server.host;
    this.port = server.port;
    this.bufferMsg = opts.bufferMsg;
    this.interval = opts.interval || constants.DEFAULT_PARAM.INTERVAL;
    this.timeoutValue = opts.timeout || constants.DEFAULT_PARAM.CALLBACK_TIMEOUT;
    this.opts = opts;
  }

  connect(tracer: Tracer, cb: (parameters?: Error) => void) {
    tracer && tracer.info('client', __filename, 'connect', 'ws-mailbox try to connect');
    if (this.connected) {
      tracer && tracer.error('client', __filename, 'connect', 'mailbox has already connected');
      cb(new Error('mailbox has already connected.'));
      return;
    }
    let self = this;
    this.socket = client.connect(this.host + ':' + this.port, <any>{
      'force new connection': true,
      'reconnect': false
    });
    this.socket.on('message', function (pkg: MailBoxPkg) {
      try {
        if (pkg instanceof Array) {
          self.processMsgs(self, pkg);
        } else {
          self.processMsg(self, pkg);
        }
      } catch (err) {
        logger.error('rpc client process message with error: %s', err.stack);
      }
    });

    this.socket.on('connect', function () {
      if (self.connected) {
        return;
      }
      self.connected = true;
      if (self.bufferMsg) {
        self._interval = setInterval(function () {
          self.flush(self);
        }, self.interval);
      }
      cb();
    });

    this.socket.on('error', function (err: Error) {
      logger.error('rpc socket is error, remote server host: %s, port: %s', self.host, self.port);
      self.emit('close', self.id);
      cb(err);
    });

    this.socket.on('disconnect', function (reason: Error) {
      logger.error('rpc socket is disconnect, reason: %s', reason);
      let reqs = self.requests,
        cb;
      for (let id in reqs) {
        cb = reqs[id];
        cb(tracer, new Error('disconnect with remote server.'));
      }
      self.emit('close', self.id);
    });
  }

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.connected = false;
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this.socket.disconnect();
  }

  /**
 * send message to remote server
 *
 * @param msg {service:"", method:"", args:[]}
 * @param opts {} attach info to send method
 * @param cb declaration decided by remote interface
 */
  send(tracer: Tracer, msg: Msg, opts: MailBoxOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    tracer && tracer.info('client', __filename, 'send', 'ws-mailbox try to send');
    if (!this.connected) {
      tracer && tracer.error('client', __filename, 'send', 'ws-mailbox not init');
      cb(tracer, new Error('ws-mailbox is not init'));
      return;
    }

    if (this.closed) {
      tracer && tracer.error('client', __filename, 'send', 'mailbox has already closed');
      cb(tracer, new Error('ws-mailbox has already closed'));
      return;
    }

    let id = this.curId++;
    this.requests[id] = cb;
    this.setCbTimeout(this, id, tracer, cb);

    let pkg: any;
    if (tracer && tracer.isEnabled) {
      pkg = {
        traceId: tracer.id,
        seqId: tracer.seq,
        source: tracer.source,
        remote: tracer.remote,
        id: id,
        msg: msg
      };
    } else {
      pkg = {
        id: id,
        msg: msg
      };
    }
    if (this.bufferMsg) {
      this.enqueue(this, pkg);
    } else {
      this.socket.emit('message', pkg);
    }
  }

  enqueue(mailbox: WSMailBox, msg: Msg) {
    mailbox.queue.push(msg);
  }

  flush(mailbox: WSMailBox) {
    if (mailbox.closed || !mailbox.queue.length) {
      return;
    }
    mailbox.socket.emit('message', mailbox.queue);
    mailbox.queue = [];
  }

  processMsgs(mailbox: WSMailBox, pkgs: Array<MailBoxPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(mailbox, pkgs[i]);
    }
  }

  processMsg(mailbox: WSMailBox, pkg: MailBoxPkg) {
    this.clearCbTimeout(mailbox, <any>pkg.id);
    let cb = mailbox.requests[pkg.id];
    if (!cb) {
      return;
    }
    delete mailbox.requests[pkg.id];
    let rpcDebugLog = mailbox.opts.rpcDebugLog;
    let tracer = null;
    let sendErr = null;
    if (rpcDebugLog) {
      tracer = new Tracer(mailbox.opts.rpcLogger, mailbox.opts.rpcDebugLog, mailbox.opts.clientId, pkg.source, pkg.resp, pkg.id, pkg.seq);
    }
    let pkgResp = pkg.resp;
    // let args = [tracer, null];

    // pkg.resp.forEach(function(arg){
    //   args.push(arg);
    // });

    cb(tracer, sendErr, pkgResp);
  }

  setCbTimeout(mailbox: WSMailBox, id: number, tracer: Tracer, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    let timer = setTimeout(() => {
      logger.warn('rpc request is timeout, id: %s, host: %s, port: %s', id, mailbox.host, mailbox.port);
      this.clearCbTimeout(mailbox, id);
      if (!!mailbox.requests[id]) {
        delete mailbox.requests[id];
      }
      logger.error('rpc callback timeout, remote server host: %s, port: %s', mailbox.host, mailbox.port);
      cb(tracer, new Error('rpc callback timeout'));
    }, mailbox.timeoutValue);
    mailbox.timeout[id] = timer;
  }

  clearCbTimeout(mailbox: WSMailBox, id: number) {
    if (!mailbox.timeout[id]) {
      logger.warn('timer is not exsits, id: %s, host: %s, port: %s', id, mailbox.host, mailbox.port);
      return;
    }
    clearTimeout(mailbox.timeout[id]);
    delete mailbox.timeout[id];
  }
}

/**
 * Factory method to create mailbox
 *
 * @param {Object} server remote server info {id:"", host:"", port:""}
 * @param {Object} opts construct parameters
 *                      opts.bufferMsg {Boolean} msg should be buffered or send immediately.
 *                      opts.interval {Boolean} msg queue flush interval if bufferMsg is true. default is 50 ms
 */
module.exports.create = function (server: { id: number, host: Function, port: string }, opts: MailBoxOpts) {
  return new WSMailBox(server, opts || <any>{});
};