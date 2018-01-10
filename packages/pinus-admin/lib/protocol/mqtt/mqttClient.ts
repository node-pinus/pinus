import { getLogger } from 'pinus-logger';
import {EventEmitter } from 'events';
import * as constants from '../../util/constants';
import * as MqttCon from 'mqtt-connection';
import * as Util from 'util';
import * as net from 'net';
import * as mqtt_connection from 'mqtt-connection';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));
export interface MqttClientOpts {
    id: string;
    reconnectDelayMax ?: number;
    timeout ?: number;
    keepalive ?: number;
}

export class MqttClient extends EventEmitter {
    clientId: string;
    id: string;
    reconnectDelayMax: number;
    timeout: number;
    keepalive: number;



    requests = {};
    connectedTimes = 1;
    host: string = null;
    port: number = null;
    socket: mqtt_connection = null;
    lastPing = -1;
    lastPong = -1;
    closed = false;
    timeoutId: NodeJS.Timer = null;
    connected = false;
    reconnectId: NodeJS.Timer = null;
    timeoutFlag = false;
    keepaliveTimer: NodeJS.Timer = null;
    reconnectDelay = 0;
    constructor(opts: MqttClientOpts) {
        super();
        this.clientId = 'MQTT_ADMIN_' + Date.now();
        this.id = opts.id;
        this.reconnectDelayMax = opts.reconnectDelayMax || constants.DEFAULT_PARAM.RECONNECT_DELAY_MAX;
        this.timeout = opts.timeout || constants.DEFAULT_PARAM.TIMEOUT;
        this.keepalive = opts.keepalive || constants.DEFAULT_PARAM.KEEPALIVE;
    }


    connect(host ?: string, port ?: number, cb ?: Function) {
        cb = cb || function () { };
        if (this.connected) {
            return cb(new Error('MqttClient has already connected.'));
        }

        if (host) {
            this.host = host;
        } else {
            host = this.host;
        }

        if (port) {
            this.port = port;
        } else {
            port = this.port;
        }

        let self = this;
        this.closed = false;

        let stream = net.createConnection(this.port, this.host);
        this.socket = MqttCon(stream);

        // logger.info('try to connect %s %s', this.host, this.port);
        this.socket.connect({
            clientId: this.clientId
        });

        this.addTimeout();

        this.socket.on('connack', function () {
            if (self.connected) {
                return;
            }

            self.connected = true;

            self.setupKeepAlive();

            if (self.connectedTimes++ === 1) {
                self.emit('connect');
                cb();
            } else {
                self.emit('reconnect');
            }
        });

        this.socket.on('publish', function (pkg: any) {
            let topic = pkg.topic;
            let msg = pkg.payload.toString();
            msg = JSON.parse(msg);

            // logger.debug('[MqttClient] publish %s %j', topic, msg);
            self.emit(topic, msg);
        });

        this.socket.on('close', function () {
            logger.error('mqtt socket is close, remote server host: %s, port: %s', host, port);
            self.onSocketClose();
        });

        this.socket.on('error', function (err: Error) {
            logger.error('mqtt socket is error, remote server host: %s, port: %s', host, port);
            // self.emit('error', new Error('[MqttClient] socket is error, remote server ' + host + ':' + port));
            self.onSocketClose();
        });

        this.socket.on('pingresp', function () {
            self.lastPong = Date.now();
        });

        this.socket.on('disconnect', function () {
            logger.error('mqtt socket is disconnect, remote server host: %s, port: %s', host, port);
            self.emit('disconnect', self.id);
            self.onSocketClose();
        });

        this.socket.on('timeout', function (reconnectFlag: boolean) {
            if (reconnectFlag) {
                self.reconnect();
            } else {
                self.exit();
            }
        });
    }

    send(topic: string, msg: any) {
        // console.log('MqttClient send %s %j ~~~', topic, msg);
        this.socket.publish({
            topic: topic,
            payload: JSON.stringify(msg)
        });
    }

    onSocketClose() {
        // console.log('onSocketClose ' + this.closed);
        if (this.closed) {
            return;
        }

        clearInterval(this.keepaliveTimer);
        clearTimeout(this.timeoutId);
        this.keepaliveTimer = null;
        this.lastPing = -1;
        this.lastPong = -1;
        this.connected = false;
        this.closed = true;
        delete this.socket;
        this.socket = null;

        if (this.connectedTimes > 1) {
            this.reconnect();
        } else {
            this.exit();
        }
    }

    addTimeout(reconnectFlag ?: boolean) {
        let self = this;
        if (this.timeoutFlag) {
            return;
        }

        this.timeoutFlag = true;

        this.timeoutId = setTimeout(function () {
            self.timeoutFlag = false;
            logger.error('mqtt client connect %s:%d timeout %d s', self.host, self.port, self.timeout / 1000);
            self.socket.emit('timeout', reconnectFlag);
        }, self.timeout);
    }

    reconnect() {
        let delay = this.reconnectDelay * 2 || constants.DEFAULT_PARAM.RECONNECT_DELAY;
        if (delay > this.reconnectDelayMax) {
            delay = this.reconnectDelayMax;
        }

        this.reconnectDelay = delay;

        let self = this;

        // logger.debug('[MqttClient] reconnect %d ...', delay);
        this.reconnectId = setTimeout(function () {
            logger.info('reconnect delay %d s', delay / 1000);
            self.addTimeout(true);
            self.connect();
        }, delay);
    }

    setupKeepAlive() {
        clearTimeout(this.reconnectId);
        clearTimeout(this.timeoutId);

        let self = this;
        this.keepaliveTimer = setInterval(function () {
            self.checkKeepAlive();
        }, this.keepalive);
    }

    checkKeepAlive() {
        if (this.closed) {
            return;
        }

        let now = Date.now();
        let KEEP_ALIVE_TIMEOUT = this.keepalive * 2;
        if (this.lastPing > 0) {
            if (this.lastPong < this.lastPing) {
                if (now - this.lastPing > KEEP_ALIVE_TIMEOUT) {
                    logger.error('mqtt rpc client checkKeepAlive error timeout for %d', KEEP_ALIVE_TIMEOUT);
                    this.close();
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

    disconnect() {
        this.close();
    }

    close() {
        this.connected = false;
        this.closed = true;
        this.socket.disconnect();
    }

    exit() {
        logger.info('exit ...');
        process.exit(0);
    }

}