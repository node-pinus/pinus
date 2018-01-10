import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'mqtt2-mailbox');
import { EventEmitter } from 'events';
import { constants } from '../../util/constants';
import { Tracer } from '../../util/tracer';
let MqttCon: any = require('mqtt-connection');
import * as utils from '../../util/utils';
import * as Coder from '../../util/coder';
import * as util from 'util';
import * as net from 'net';
import { Msg } from '../../util/coder';
import { Stream } from 'stream';

let CONNECT_TIMEOUT = 2000;

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
}

export class MQTT2MailBox extends EventEmitter {
  curId: number = 0;
  id: number;
  host: Function;
  port: string;
  requests: { [key: string]: any } = {};
  timeout: { [key: string]: any } = {};
  queue: Array<any> = [];
  servicesMap: { [key: string]: any } = {};
  bufferMsg: any;
  keepalive: number;
  interval: number;
  timeoutValue: number;
  keepaliveTimer: any = null;
  lastPing: number = -1;
  lastPong: number = -1;
  connected: boolean = false;
  closed: boolean = false;
  serverId: string;
  opts: any;
  socket: any;
  _interval: any;

  constructor(server: { id: number, host: Function, port: string }, opts: MailBoxOpts) {
    super();
    this.id = server.id;
    this.host = server.host;
    this.port = server.port;
    this.bufferMsg = opts.bufferMsg;
    this.keepalive = opts.keepalive || constants.DEFAULT_PARAM.KEEPALIVE;
    this.interval = opts.interval || constants.DEFAULT_PARAM.INTERVAL;
    this.timeoutValue = opts.timeout || constants.DEFAULT_PARAM.CALLBACK_TIMEOUT;
    this.opts = opts;
    this.serverId = opts.context.serverId;
  }

  connect(tracer: Tracer, cb: (parameter?: Error) => void) {
    tracer && tracer.info('client', __filename, 'connect', 'mqtt-mailbox try to connect');
    if (this.connected) {
      tracer && tracer.error('client', __filename, 'connect', 'mailbox has already connected');
      return cb(new Error('mailbox has already connected.'));
    }

    let self = this;

    let stream = net.createConnection(this.port, this.host);
    this.socket = MqttCon(stream);

    let connectTimeout = setTimeout(function () {
      logger.error('rpc client %s connect to remote server %s timeout', self.serverId, self.id);
      self.emit('close', self.id);
    }, CONNECT_TIMEOUT);

    this.socket.connect({
      clientId: 'MQTT_RPC_' + Date.now()
    }, function () {
      if (self.connected) {
        return;
      }

      clearTimeout(connectTimeout);
      self.connected = true;
      if (self.bufferMsg) {
        self._interval = setInterval(function () {
          self.flush(self);
        }, self.interval);
      }

      self.setupKeepAlive();
    });

    this.socket.on('publish', function (pkg: MailBoxPkg) {
      if (pkg.topic === constants['TOPIC_HANDSHAKE']) {
        self.upgradeHandshake(self, pkg.payload);
        return cb();
      }
      try {
        pkg = <any>Coder.decodeClient(pkg.payload);
        self.processMsg(self, pkg);
      } catch (err) {
        logger.error('rpc client %s process remote server %s message with error: %s', self.serverId, self.id, err.stack);
      }
    });

    this.socket.on('error', function (err: Error) {
      logger.error('rpc socket %s is error, remote server %s host: %s, port: %s', self.serverId, self.id, self.host, self.port);
      self.emit('close', self.id);
      self.close();
    });

    this.socket.on('pingresp', function () {
      self.lastPong = Date.now();
    });

    this.socket.on('disconnect', function (reason: Error) {
      logger.error('rpc socket %s is disconnect from remote server %s, reason: %s', self.serverId, self.id, reason);
      let reqs = self.requests;
      for (let id in reqs) {
        let ReqCb = reqs[id];
        ReqCb(tracer, new Error(self.serverId + ' disconnect with remote server ' + self.id));
      }
      self.emit('close', self.id);
    });
  }

  /**
   * close mailbox
   */
  close() {
    this.closed = true;
    this.connected = false;
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
    }
  }

  /**
 * send message to remote server
 *
 * @param msg {service:"", method:"", args:[]}
 * @param opts {} attach info to send method
 * @param cb declaration decided by remote interface
 */
  send(tracer: Tracer, msg: Coder.Msg, opts: MailBoxOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    tracer && tracer.info('client', __filename, 'send', 'mqtt-mailbox try to send');
    if (!this.connected) {
      tracer && tracer.error('client', __filename, 'send', 'mqtt-mailbox not init');
      cb(tracer, new Error(this.serverId + ' mqtt-mailbox is not init ' + this.id));
      return;
    }
    if (this.closed) {
      tracer && tracer.error('client', __filename, 'send', 'mailbox has already closed');
      cb(tracer, new Error(this.serverId + ' mqtt-mailbox has already closed ' + this.id));
      return;
    }

    let id = this.curId++;
    this.requests[id] = cb;
    this.setCbTimeout(this, id, tracer, cb);

    let pkg;
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
      pkg = <any>Coder.encodeClient(id, msg, this.servicesMap);
      // pkg = {
      //   id: id,
      //   msg: msg
      // };
    }
    if (this.bufferMsg) {
      this.enqueue(this, pkg);
    } else {
      this.doSend(this.socket, pkg);
    }
  }

  setupKeepAlive() {
    let self = this;
    this.keepaliveTimer = setInterval(function () {
      self.checkKeepAlive();
    }, this.keepalive);
  }

  checkKeepAlive() {
    if (this.closed) {
      return;
    }

    // console.log('checkKeepAlive lastPing %d lastPong %d ~~~', this.lastPing, this.lastPong);
    let now = Date.now();
    let KEEP_ALIVE_TIMEOUT = this.keepalive * 2;
    if (this.lastPing > 0) {
      if (this.lastPong < this.lastPing) {
        if (now - this.lastPing > KEEP_ALIVE_TIMEOUT) {
          logger.error('mqtt rpc client %s checkKeepAlive timeout from remote server %s for %d lastPing: %s lastPong: %s', this.serverId, this.id, KEEP_ALIVE_TIMEOUT, this.lastPing, this.lastPong);
          this.emit('close', this.id);
          this.lastPing = -1;
          // this.close();
        }
      } else {
        this.socket.pingreq();
        this.lastPing = Date.now();
      }
    } else {
      this.socket.pingreq();
      this.lastPing = Date.now();
    }
  }

  enqueue(mailbox: MQTT2MailBox, msg: Coder.Msg) {
    mailbox.queue.push(msg);
  }

  flush(mailbox: MQTT2MailBox) {
    if (mailbox.closed || !mailbox.queue.length) {
      return;
    }
    this.doSend(mailbox.socket, <any>mailbox.queue);
    mailbox.queue = [];
  }

  doSend(socket: any, msg: Coder.Msg) {
    socket.publish({
      topic: 'rpc',
      payload: msg
      // payload: JSON.stringify(msg)
    });
  }

  upgradeHandshake(mailbox: MQTT2MailBox, msg: Coder.Msg) {
    let servicesMap = JSON.parse(msg.toString());
    mailbox.servicesMap = servicesMap;
  }

  processMsgs(mailbox: MQTT2MailBox, pkgs: Array<MailBoxPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(mailbox, pkgs[i]);
    }
  }

  processMsg(mailbox: MQTT2MailBox, pkg: MailBoxPkg) {
    let pkgId = <any>pkg.id;
    this.clearCbTimeout(mailbox, pkgId);
    let cb = mailbox.requests[pkgId];
    if (!cb) {
      return;
    }

    delete mailbox.requests[pkgId];
    let rpcDebugLog = mailbox.opts.rpcDebugLog;
    let tracer = null;
    let sendErr = null;
    if (rpcDebugLog) {
      tracer = new Tracer(mailbox.opts.rpcLogger, mailbox.opts.rpcDebugLog, mailbox.opts.clientId, pkg.source, pkg.resp, pkg.id, pkg.seq);
    }
    let pkgResp = pkg.resp;

    cb(tracer, sendErr, pkgResp);
  }

  setCbTimeout(mailbox: MQTT2MailBox, id: number, tracer: Tracer, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    // console.log('setCbTimeout %d', id);
    let timer = setTimeout(() => {
      // logger.warn('rpc request is timeout, id: %s, host: %s, port: %s', id, mailbox.host, mailbox.port);
      this.clearCbTimeout(mailbox, id);
      if (mailbox.requests[id]) {
        delete mailbox.requests[id];
      }
      let eMsg = util.format('rpc %s callback timeout %d, remote server %s host: %s, port: %s', mailbox.serverId, mailbox.timeoutValue, id, mailbox.host, mailbox.port);
      logger.error(eMsg);
      cb(tracer, new Error(eMsg));
    }, mailbox.timeoutValue);
    mailbox.timeout[id] = timer;
  }

  clearCbTimeout(mailbox: MQTT2MailBox, id: number) {
    // console.log('clearCbTimeout %d', id);
    if (!mailbox.timeout[id]) {
      logger.warn('timer is not exsits, serverId: %s remote: %s, host: %s, port: %s', mailbox.serverId, id, mailbox.host, mailbox.port);
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
  return new MQTT2MailBox(server, opts || <any>{});
};