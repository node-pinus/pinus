import * as util from 'util';
import { EventEmitter } from 'events';
import { ISocket } from '../interfaces/ISocket';
import * as mqtt_connection from 'mqtt-connection';
import { MqttAdaptor } from './mqtt/mqttadaptor';

let ST_INITED = 1;
let ST_CLOSED = 2;

/**
 * Socket class that wraps socket and websocket to provide unified interface for up level.
 */
export class MQTTSocket extends EventEmitter implements ISocket {
    id: number;
    socket: mqtt_connection;
    remoteAddress: { ip: string, port: number };
    adaptor: MqttAdaptor;

    state: number;

    constructor(id: number, socket: mqtt_connection, adaptor: MqttAdaptor) {
        super();
        this.id = id;
        this.socket = socket;
        this.remoteAddress = {
            ip: socket.stream.remoteAddress,
            port: socket.stream.remotePort
        };
        this.adaptor = adaptor;

        let self = this;

        socket.on('close', this.emit.bind(this, 'disconnect'));
        socket.on('error', this.emit.bind(this, 'disconnect'));
        socket.on('disconnect', this.emit.bind(this, 'disconnect'));

        socket.on('pingreq', function (packet: any) {
            socket.pingresp();
        });

        socket.on('subscribe', this.adaptor.onSubscribe.bind(this.adaptor, this));

        socket.on('publish', this.adaptor.onPublish.bind(this.adaptor, this));

        this.state = ST_INITED;

        // TODO: any other events?
    }


    send(msg: any) {
        if (this.state !== ST_INITED) {
            return;
        }
        if (msg instanceof Buffer) {
            // if encoded, send directly
            this.socket.stream.write(msg);
        } else {
            this.adaptor.publish(this, msg);
        }
    }

    sendRaw = this.send;

    sendBatch(msgs: any[]) {
        for (let i = 0, l = msgs.length; i < l; i++) {
            this.send(msgs[i]);
        }
    }

    disconnect() {
        if (this.state === ST_CLOSED) {
            return;
        }

        this.state = ST_CLOSED;
        this.socket.stream.destroy();
    }
}