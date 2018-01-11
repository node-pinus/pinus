/*!
 * Pinus -- commandLine Client
 * Copyright(c) 2015 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */

 import { EventEmitter } from 'events';



import {MqttClient} from '../protocol/mqtt/mqttClient';
import * as protocol from '../util/protocol';
// let io = require('socket.io-client');
import * as utils from '../util/utils';
import { Callback } from '../util/constants';

export interface AdminClientOption {username?: string ; password?: string; md5?: boolean; }
export type RequestMsg =
{
    clientId?: string;
    username?: string;
} & any;
export type Listener = (...args: any[]) => void;

export class AdminClient {
    static ST_INITED = 1;
    static ST_CONNECTED = 2;
    static ST_REGISTERED = 3;
    static ST_CLOSED = 4;

    id = '';
    reqId = 1;
    callbacks: {[respId: string]: Callback} = {};
    _listeners: {[evt: string]: Listener[]} = {};
    state = AdminClient.ST_INITED;
    socket: MqttClient;
    username = '';
    password = '';
    md5 = false;
    constructor(opt: AdminClientOption) {
        this.id = '';
        this.reqId = 1;
        this.callbacks = {};
        this._listeners = {};
        this.state = AdminClient.ST_INITED;
        this.socket = null;
        opt = opt || {};
        this.username = opt['username'] || '';
        this.password = opt['password'] || '';
        this.md5 = opt['md5'] || false;
    }

    connect(id: string, host: string, port: number, cb: (msg?: any) => void) {
        this.id = id;
        let self = this;

        console.log('try to connect ' + host + ':' + port);
        this.socket = new MqttClient({
            id: id
        });

        this.socket.connect(host, port);

        // this.socket = io.connect('http://' + host + ':' + port, {
        //     'force new connection': true,
        //     'reconnect': false
        // });

        this.socket.on('connect',  () => {
            self.state = AdminClient.ST_CONNECTED;
            if (self.md5) {
                self.password = utils.md5(self.password);
            }
            self.doSend('register', {
                type: 'client',
                id: id,
                username: self.username,
                password: self.password,
                md5: self.md5
            });
        });

        this.socket.on('register',  (res) => {
            if (res.code !== protocol.PRO_OK) {
                cb(res.msg);
                return;
            }

            self.state = AdminClient.ST_REGISTERED;
            cb();
        });

        this.socket.on('client',  (msg) => {
            msg = protocol.parse(msg);
            if (msg.respId) {
                // response for request
                let cb = self.callbacks[msg.respId];
                delete self.callbacks[msg.respId];
                if (cb && typeof cb === 'function') {
                    cb(msg.error, msg.body);
                }
            } else if (msg.moduleId) {
                // notify
                self.emit(msg.moduleId, msg);
            }
        });

        this.socket.on('error', function (err) {
            if (self.state < AdminClient.ST_CONNECTED) {
                cb(err);
            }

            self.emit('error', err);
        });

        this.socket.on('disconnect',  (reason) => {
            this.state = AdminClient.ST_CLOSED;
            self.emit('close');
        });
    }

    request(moduleId: string, msg ?: RequestMsg, cb?: Callback) {
        let id = this.reqId++;
        // something dirty: attach current client id into msg
        msg = msg || {};
        msg.clientId = this.id;
        msg.username = this.username;
        let req = protocol.composeRequest(id, moduleId, msg);
        this.callbacks[id] = cb;
        this.doSend('client', req);
        // this.socket.emit('client', req);
    }

    notify(moduleId: string, msg: RequestMsg) {
        // something dirty: attach current client id into msg
        msg = msg || {};
        msg.clientId = this.id;
        msg.username = this.username;
        let req = protocol.composeRequest(null, moduleId, msg);
        this.doSend('client', req);
        // this.socket.emit('client', req);
    }

    command(command: string, moduleId: string, msg: RequestMsg, cb: Callback) {
        let id = this.reqId++;
        msg = msg || {};
        msg.clientId = this.id;
        msg.username = this.username;
        let commandReq = protocol.composeCommand(id, command, moduleId, msg);
        this.callbacks[id] = cb;
        this.doSend('client', commandReq);
        // this.socket.emit('client', commandReq);
    }

    doSend(topic: string, msg: any) {
        this.socket.send(topic, msg);
    }

    on(event: string, listener: Listener) {
        this._listeners[event] = this._listeners[event] || [];
        this._listeners[event].push(listener);
    }

    emit(event: string , ... args: any[]) {
        let _listeners = this._listeners[event];
        if (!_listeners || !_listeners.length) {
            return;
        }

        let listener: Listener;
        for (let i = 0, l = _listeners.length; i < l; i++) {
            listener = _listeners[i];
            if (typeof listener === 'function') {
                listener.apply(null, args);
            }
        }
    }
}