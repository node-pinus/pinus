import { getLogger } from 'pinus-logger';
import { EventEmitter } from 'events';
import * as mqtt_connection from 'mqtt-connection';
import * as Util from 'util';
import * as net from 'net';
import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));


export interface MqttSocket extends mqtt_connection {
    send(topic: string , msg: any): void;
}

export interface MqttServer {
    on(event: 'connection', listener: (socket: MqttSocket) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'closed', listener: () => void): this;
    on(event: string, listener: (msg: any) => void): this;
}

let curId = 1;
export class MqttServer extends EventEmitter {
    inited = false;
    closed = true;
    server: net.Server;
    socket: mqtt_connection;

    constructor(private opts?: any, private cb?: Function) {
        super();
    }


    listen(port: number) {
        // check status
        if (this.inited) {
            this.cb(new Error('already inited.'));
            return;
        }

        this.inited = true;

        let self = this;

        this.server = new net.Server();
        this.server.listen(port);

        logger.info('[MqttServer] listen on %d', port);

        this.server.on('listening', this.emit.bind(this, 'listening'));

        this.server.on('error', function (err) {
            // logger.error('mqtt server is error: %j', err.stack);
            self.emit('error', err);
        });

        this.server.on('connection', function (stream) {
            let socket = mqtt_connection(stream) as MqttSocket;
            socket.id = curId++;

            self.socket = socket;

            socket.on('connect',  (pkg: any) => {
                socket.connack({
                    returnCode: 0
                });
            });

            socket.on('publish', function (pkg: any) {
                let topic = pkg.topic;
                let msg = pkg.payload.toString();
                msg = JSON.parse(msg);

                // logger.debug('[MqttServer] publish %s %j', topic, msg);
                socket.emit(topic, msg);
            });

            socket.on('pingreq', function () {
                socket.pingresp();
            });

            socket.send = function (topic: string, msg: any) {
                socket.publish({
                    topic: topic,
                    payload: JSON.stringify(msg)
                });
            };

            self.emit('connection', socket);
        });
    }

    send(topic: string, msg: any) {
        this.socket.publish({
            topic: topic,
            payload: msg
        });
    }

    close() {
        if (this.closed) {
            return;
        }

        this.socket = undefined;
        this.closed = true;
        this.server.close();
        this.emit('closed');
    }
}