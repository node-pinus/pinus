import * as util from 'util';
import { EventEmitter } from 'events';
import * as net from 'net';
import * as constants from '../util/constants';
import { MQTTSocket } from './mqttsocket';
import { MqttAdaptor } from './mqtt/mqttadaptor';
import * as generate from './mqtt/generate';
import { getLogger } from 'pinus-logger';
import { IConnector } from '../interfaces/IConnector';
import * as mqtt_connection from 'mqtt-connection';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));



export interface MQTTConnectorOptions {
    publishRoute ?: string;
    subscribeRoute ?: string;
}

let curId = 1;
/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Develper can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
export class MQTTConnector extends EventEmitter implements IConnector {

    port: number;
    host: string;
    opts: any;
    adaptor: MqttAdaptor;
    server: net.Server;
    constructor(port: number, host: string, opts ?: MQTTConnectorOptions) {
        super();
        this.port = port;
        this.host = host;
        this.opts = opts || {};

        this.adaptor = new MqttAdaptor(this.opts);
    }

    /**
     * Start connector to listen the specified port
     */
    start(cb: () => void) {
        let self = this;
        this.server = new net.Server();
        this.server.listen(this.port);
        logger.info('[MQTTConnector] listen on %d', this.port);

        this.server.on('error', function (err) {
            // logger.error('mqtt server is error: %j', err.stack);
            self.emit('error', err);
        });

        this.server.on('connection', (stream) => {
            let client = mqtt_connection(stream);

            client.on('error', function (err: Error) {
                client.destroy();
            });

            client.on('close', function () {
                client.destroy();
            });

            client.on('disconnect', function (packet: any) {
                client.destroy();
            });
            // stream timeout
            stream.on('timeout', function () { client.destroy(); });
            // client published
            client.on('publish', function (packet: any) {
                // send a puback with messageId (for QoS > 0)
                client.puback({ messageId: packet.messageId });
            });
            // client pinged
            client.on('pingreq', function () {
                // send a pingresp
                client.pingresp();
            });

            if (self.opts.disconnectOnTimeout) {
                let timeout = self.opts.timeout * 1000 || constants.TIME.DEFAULT_MQTT_HEARTBEAT_TIMEOUT;
                stream.setTimeout(timeout, function () {
                    client.destroy();
                    client.emit('close');
                });
            }

            client.on('connect', function (packet: any) {
                client.connack({ returnCode: 0 });
                let mqttsocket = new MQTTSocket(curId++, client, self.adaptor);
                self.emit('connection', mqttsocket);
            });
        });


        process.nextTick(cb);
    }

    stop() {
        this.server.close();
        process.exit(0);
    }


    encode(reqId: number, route: string, msgBody: any) {
        if (!!reqId) {
            return composeResponse(reqId, route, msgBody);
        } else {
            return composePush(route, msgBody);
        }
    }

    close() {
        this.server.close();
    }
}
let composeResponse = function (msgId: number, route: string, msgBody: any) {
    return {
        id: msgId,
        body: msgBody
    };
};

let composePush = function (route: string, msgBody: any) {
    let msg = generate.publish(msgBody);
    if (!msg) {
        logger.error('invalid mqtt publish message: %j', msgBody);
    }

    return msg;
};