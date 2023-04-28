/**
 * 更健壮的MQTT客户端，除非主动调用disconnect，否则会始终保持与server的连接
 * 情况1：
 *   master必须第一个启动，才能启动其它服务器进程，否则会启动失败。调整后，不需要必须先启动master，其它进程如果先启动了，会等待master启动后再向master注册
 * 情况2：
 *  由于master上会注册所有服务器进程，在重启master的过程中发现有概率出现心跳超时直接就断开monitorAgent与masterAgent的连接，不会重连。
 *  断开后会导致其它进程向master注册或者移除无法通知到连接断开的服务器，需要自己排查进程是不是断开了，手动重启断开的进程才能重新连接masterAgent
 */
import { getLogger } from 'pinus-logger';
import * as path from 'path';
import { MqttClient } from './mqttClient';
let logger = getLogger('pinus-admin', path.basename(__filename));

export class RobustMqttClient extends MqttClient {
    
    connect(host ?: string, port ?: number, cb ?: Function) {
        super.connect(host, port, cb);

        let self = this;
        // 移除父类监听，使用新的超时机制
        this.socket.removeAllListeners('timeout');
        this.socket.on('timeout', function () {
            self.onSocketClose();
        });
    }

    onSocketClose() {
        // console.log('onSocketClose ' + this.closed);
        if (this.closed) {
            return;
        }
        this.disconnect();
        this.reconnect();
    }

    checkKeepAlive() {
        if (this.closed) {
            return;
        }

        let now = Date.now();
        let KEEP_ALIVE_TIMEOUT = this.keepalive * 2;
        if (this.lastPong < this.lastPing && now - this.lastPing > KEEP_ALIVE_TIMEOUT) {
            logger.error('mqtt rpc client checkKeepAlive error timeout for %d', KEEP_ALIVE_TIMEOUT);
            this.onSocketClose();
        } else {
            this.socket.pingreq();
            this.lastPing = Date.now();
        }
    }

    disconnect() {
        this.connected = false;
        this.closed = true;
        // 取消定时
        clearInterval(this.keepaliveTimer);
        clearTimeout(this.timeoutId);
        clearTimeout(this.reconnectId);
        // 重置
        this.lastPing = -1;
        this.lastPong = -1;
        // 释放连接
        this.socket?.disconnect();
        delete this.socket;
        this.socket = null;
    }
}