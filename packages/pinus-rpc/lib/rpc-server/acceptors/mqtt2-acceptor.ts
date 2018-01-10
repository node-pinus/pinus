import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'mqtt2-acceptor');
import { EventEmitter } from 'events';
import {constants} from '../../util/constants';
import { Tracer } from '../../util/tracer';
import * as utils from '../../util/utils';
import * as Coder from '../../util/coder';
let MqttCon: any = require('mqtt-connection');
import * as util from 'util';
import * as net from 'net';

let curId = 1;

export interface AcceptorPkg {
  source: string;
  remote: string;
  id: string & number;
  seq: number;
  msg: string;
  payload: any;
}

export interface AcceptorOpts {
  interval: number;
  bufferMsg: any;
  rpcLogger: any;
  rpcDebugLog: any;
  services: any;
}

export class MQTT2Acceptor extends EventEmitter {
  interval: number; // flush interval in ms
  bufferMsg: any;
  rpcLogger: any;
  rpcDebugLog: any;
  services: any;
  _interval: any; // interval object
  sockets: any;
  msgQueues: any;
  servicesMap: any;
  cb: any;
  inited: boolean;
  server: net.Server;
  closed: boolean;

  constructor(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
    super();
    this.interval = opts.interval; // flush interval in ms
    this.bufferMsg = opts.bufferMsg;
    this.rpcLogger = opts.rpcLogger;
    this.rpcDebugLog = opts.rpcDebugLog;
    this.services = opts.services;
    this._interval = null; // interval object
    this.sockets = {};
    this.msgQueues = {};
    this.servicesMap = {};
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

    this.server = new net.Server();
    this.server.listen(port);

    this.server.on('error', function (err) {
      logger.error('rpc server is error: %j', err.stack);
      self.emit('error', err);
    });

    this.server.on('connection', function (stream) {
      let socket = MqttCon(stream);
      socket['id'] = curId++;

      socket.on('connect', function (pkg: AcceptorPkg) {
        console.log('connected');
        self.sendHandshake(socket, self);
      });

      socket.on('publish', function (pkg: AcceptorPkg) {
        let newPkg: any = Coder.decodeServer(pkg.payload, self.servicesMap);
        try {
          self.processMsg(socket, self, newPkg);
        } catch (err) {
          let resp = Coder.encodeServer(newPkg.id, [self.cloneError(err)]);
          // doSend(socket, resp);
          logger.error('process rpc message error %s', err.stack);
        }
      });

      socket.on('pingreq', function () {
        socket.pingresp();
      });

      socket.on('error', function () {
        self.onSocketClose(socket);
      });

      socket.on('close', function () {
        self.onSocketClose(socket);
      });

      self.sockets[socket.id] = socket;

      socket.on('disconnect', function (reason: Error) {
        self.onSocketClose(socket);
      });
    });

    if (this.bufferMsg) {
      this._interval = setInterval(function () {
        self.flush(self);
      }, this.interval);
    }
  }

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this.server.close();
    this.emit('closed');
  }

  onSocketClose(socket: any) {
    if (!socket['closed']) {
      let id = socket.id;
      socket['closed'] = true;
      delete this.sockets[id];
      delete this.msgQueues[id];
    }
  }

  cloneError(origin: { msg: string, stack: object }) {
    // copy the stack infos for Error instance json result is empty
    let res = {
      msg: origin.msg,
      stack: origin.stack
    };
    return res;
  }

  processMsg(socket: object, acceptor: MQTT2Acceptor, pkg: AcceptorPkg) {
    let tracer: Tracer = null;
    if (this.rpcDebugLog) {
      tracer = new Tracer(acceptor.rpcLogger, acceptor.rpcDebugLog, pkg.remote, pkg.source, pkg.msg, pkg.id, pkg.seq);
      tracer.info('server', __filename, 'processMsg', 'mqtt-acceptor receive message and try to process message');
    }
    acceptor.cb(tracer, pkg.msg, (... args: any[]) => {
      // let args = Array.prototype.slice.call(arguments, 0);
      let len = arguments.length;
      for (let i = 0; i < len; i++) {
        args[i] = arguments[i];
      }

      let errorArg = args[0]; // first callback argument can be error object, the others are message
      if (errorArg && errorArg instanceof Error) {
        args[0] = this.cloneError(<any>errorArg);
      }

      let resp;
      if (tracer && tracer.isEnabled) {
        resp = {
          traceId: tracer.id,
          seqId: tracer.seq,
          source: tracer.source,
          id: pkg.id,
          resp: args
        };
      } else {
        resp = <any>Coder.encodeServer(pkg.id, args);
        // resp = {
        //   id: pkg.id,
        //   resp: args
        // };
      }
      if (acceptor.bufferMsg) {
        this.enqueue(socket, acceptor, resp);
      } else {
        this.doSend(socket, resp);
      }
    });
  }

  processMsgs(socket: any, acceptor: MQTT2Acceptor, pkgs: Array<AcceptorPkg>) {
    for (let i = 0, l = pkgs.length; i < l; i++) {
      this.processMsg(socket, acceptor, pkgs[i]);
    }
  }

  enqueue(socket: any, acceptor: MQTT2Acceptor, msg: {[key: string]: any}) {
    let id = socket.id;
    let queue = acceptor.msgQueues[id];
    if (!queue) {
      queue = acceptor.msgQueues[id] = [];
    }
    queue.push(msg);
  }

  flush(acceptor: MQTT2Acceptor) {
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
      queues[socketId] = [];
    }
  }

  doSend(socket: any, msg: Coder.Msg) {
    socket.publish({
      topic: constants['TOPIC_RPC'],
      payload: msg
      // payload: JSON.stringify(msg)
    });
  }

  doSendHandshake(socket: any, msg: string) {
    socket.publish({
      topic: constants['TOPIC_HANDSHAKE'],
      payload: msg
      // payload: JSON.stringify(msg)
    });
  }

  sendHandshake(socket: any, acceptor: MQTT2Acceptor) {
    // let servicesMap = utils.genServicesMap(acceptor.services);
    // acceptor.servicesMap = servicesMap;
    // this.doSendHandshake(socket, JSON.stringify(servicesMap));
    let servicesMap = JSON.parse(acceptor.services);
    acceptor.servicesMap = servicesMap;
    this.doSendHandshake(socket, JSON.stringify(servicesMap));
  }
}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
export function create(opts: AcceptorOpts, cb: (tracer: Tracer, msg?: any, cb?: Function) => void) {
  return new MQTT2Acceptor(opts || <any>{}, cb);
}