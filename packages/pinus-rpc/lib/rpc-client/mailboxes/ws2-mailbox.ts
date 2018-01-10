import { EventEmitter } from 'events';
import * as util from 'util';
import * as utils from '../../util/utils';
import * as wsClient from 'ws';
import * as zlib from 'zlib';
import { Tracer } from '../../util/tracer';
import { Msg } from '../../util/coder';
import { WS2Acceptor } from '../../rpc-server/acceptors/ws2-acceptor';

let DEFAULT_CALLBACK_TIMEOUT = 10 * 1000;
let DEFAULT_INTERVAL = 50;

let KEEP_ALIVE_TIMEOUT = 10 * 1000;
let KEEP_ALIVE_INTERVAL = 30 * 1000;

let DEFAULT_ZIP_LENGTH = 1024 * 10;
let useZipCompress = false;

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
  doZipLength: number;
  useZipCompress: boolean;

}

export class WS2MailBox extends EventEmitter {
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
  _KPinterval: any = null;
  _KP_last_ping_time: number = -1;
  _KP_last_pong_time: number = -1;
  DEFAULT_ZIP_LENGTH: number;
  useZipCompress: boolean;

  constructor(server: { id: number, host: Function, port: string }, opts: MailBoxOpts) {
    super();
    this.id = server.id;
    this.host = server.host;
    this.port = server.port;
    this.bufferMsg = opts.bufferMsg;
    this.interval = opts.interval || DEFAULT_INTERVAL;
    this.timeoutValue = opts.timeout || DEFAULT_CALLBACK_TIMEOUT;
    this.opts = opts;
    DEFAULT_ZIP_LENGTH = opts.doZipLength || DEFAULT_ZIP_LENGTH;
    useZipCompress = opts.useZipCompress || false;
  }

  connect(tracer: Tracer, cb: (parameters?: Error) => void) {
    tracer && tracer.info('client', __filename, 'connect', 'ws-mailbox try to connect');
    if (this.connected) {
      tracer && tracer.error('client', __filename, 'connect', 'mailbox has already connected');
      cb(new Error('mailbox has already connected.'));
      return;
    }

    this.socket = new wsClient('ws://' + this.host + ':' + this.port);
    // this.socket = wsClient.connect(this.host + ':' + this.port, {'force new connection': true, 'reconnect': false});

    let self = this;
    this.socket.on('message', function (data: string, flags: boolean) {
      try {
        // console.log("ws rpc client received message = " + data);
        let msg: any = data;

        msg = JSON.parse(msg);

        if (msg.body instanceof Array) {
          self.processMsgs(self, msg.body);
        } else {
          self.processMsg(self, msg.body);
        }
      } catch (e) {
        console.error('ws rpc client process message with error: %j', e.stack);
      }
    });

    this.socket.on('open', function () {
      if (self.connected) {
        // ignore reconnect
        return;
      }
      // success to connect
      self.connected = true;
      if (self.bufferMsg) {
        // start flush interval
        self._interval = setInterval(function () {
          self.flush(self);
        }, self.interval);
      }
      self._KPinterval = setInterval(function () {
        self.checkKeepAlive(self);
      }, KEEP_ALIVE_INTERVAL);
      utils.invokeCallback(cb, null);
    });

    this.socket.on('error', function (err: Error) {
      utils.invokeCallback(cb, err);
      self.close();
    });

    this.socket.on('close', function (code: string, message: any) {
      let reqs = self.requests,
        cb;
      for (let id in reqs) {
        cb = reqs[id];
        utils.invokeCallback(cb, new Error('disconnect with remote server.'));
      }
      self.emit('close', self.id);
      self.close();
    });

    //  this.socket.on('ping', function (data, flags) {
    //  });
    this.socket.on('pong', function (data: object, flags: boolean) {
      // console.log('ws received pong: %s', data);
      self._KP_last_pong_time = Date.now();
    });
  }

  checkKeepAlive = function (mailbox: WS2MailBox) {
    if (mailbox.closed) {
      return;
    }
    let now = Date.now();
    if (mailbox._KP_last_ping_time > 0) {
      if (mailbox._KP_last_pong_time < mailbox._KP_last_ping_time) {
        if (now - mailbox._KP_last_ping_time > KEEP_ALIVE_TIMEOUT) {
          console.error('ws rpc client checkKeepAlive error because > KEEP_ALIVE_TIMEOUT');
          mailbox.close();
          return;
        } else {
          return;
        }
      }
      if (mailbox._KP_last_pong_time >= mailbox._KP_last_ping_time) {
        mailbox.socket.ping();
        mailbox._KP_last_ping_time = Date.now();
        return;
      }
    } else {
      mailbox.socket.ping();
      mailbox._KP_last_ping_time = Date.now();
    }
  };

  /**
   * close mailbox
   */
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
    if (this._KPinterval) {
      clearInterval(this._KPinterval);
      this._KPinterval = null;
    }
    this.socket.close();
    this._KP_last_ping_time = -1;
    this._KP_last_pong_time = -1;
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
      cb(tracer, new Error('not init.'));
      return;
    }

    if (this.closed) {
      tracer && tracer.error('client', __filename, 'send', 'mailbox alread closed');
      cb(tracer, new Error('mailbox alread closed.'));
      return;
    }

    let id = this.curId++;
    this.requests[id] = cb;
    this.setCbTimeout(this, id);

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
      this.doSend(this.socket, pkg);
      // this.socket.send(JSON.stringify({body: pkg}));
    }
  }
  enqueue(mailbox: WS2MailBox, msg: Msg) {
    mailbox.queue.push(msg);
  }

  flush (mailbox: WS2MailBox) {
    if (mailbox.closed || !mailbox.queue.length) {
      return;
    }
    this.doSend(mailbox.socket, mailbox.queue);
    // mailbox.socket.send(JSON.stringify({body: mailbox.queue}));
    mailbox.queue = [];
  }

  doSend(socket: any, dataObj: Object) {
    let str = JSON.stringify({
      body: dataObj
    });
    // console.log("ws rpc client send str = " + str);
    // console.log("ws rpc client send str len = " + str.length);
    // console.log("ws rpc client send message, len = " + str.length);
    socket.send(str);
  }

  processMsgs(mailbox: WS2MailBox, pkgs: Array<MailBoxPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(mailbox, pkgs[i]);
    }
  }
  processMsg(mailbox: WS2MailBox, pkg: MailBoxPkg) {
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

  setCbTimeout(mailbox: WS2MailBox, id: number) {
    let timer = setTimeout(() => {
      this.clearCbTimeout(mailbox, id);
      if (!!mailbox.requests[id]) {
        delete mailbox.requests[id];
      }
    }, mailbox.timeoutValue);
    mailbox.timeout[id] = timer;
  }

  clearCbTimeout(mailbox: WS2MailBox, id: number) {
    if (!mailbox.timeout[id]) {
      console.warn('timer is not exsits, id: %s', id);
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
  return new WS2MailBox(server, opts || <any>{});
};