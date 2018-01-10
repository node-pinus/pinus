
import * as mqtt_connection from 'mqtt-connection';
import { MQTTSocket } from '../mqttsocket';
export interface MqttAdaptorOptions {
    publishRoute ?: string;
    subscribeRoute ?: string;

}
export interface SubscribePacket {
    messageId: number;
    subscriptions: { topic: string, qos: number }[];
}

export interface PublishPacket {
    topic: string;
    payload: any;
    messageId: number;
    qos: number;
}

export class MqttAdaptor {
    subReqs: {[messageId: number]: SubscribePacket} = {};
    publishRoute: string;
    subscribeRoute: string;
    constructor(opts ?: MqttAdaptorOptions) {
        opts = opts || {};
        this.publishRoute = opts.publishRoute;
        this.subscribeRoute = opts.subscribeRoute;
    }

    onPublish(client: MQTTSocket, packet: PublishPacket) {
        let route = this.publishRoute;

        if (!route) {
            throw new Error('unspecified publish route.');
        }

        let payload = packet.payload;
        if (payload instanceof Buffer) {
            payload = payload.toString('utf8');
        }

        let req = {
            id: packet.messageId,
            route: route,
            body: packet
        };

        client.emit('message', req);

        if (packet.qos === 1) {
            client.socket.puback({ messageId: packet.messageId });
        }
    }

    onSubscribe(client: MQTTSocket, packet: SubscribePacket) {
        let route = this.subscribeRoute;

        if (!route) {
            throw new Error('unspecified subscribe route.');
        }

        let req = {
            id: packet.messageId,
            route: route,
            body: {
                subscriptions: packet.subscriptions
            }
        };

        this.subReqs[packet.messageId] = packet;

        client.emit('message', req);
    }

    onPubAck(client: MQTTSocket, packet: SubscribePacket) {
        let req = {
            id: packet.messageId,
            route: 'connector.mqttHandler.pubAck',
            body: {
                mid: packet.messageId
            }
        };

        this.subReqs[packet.messageId] = packet;

        client.emit('message', req);
    }

    /**
     * Publish message or subscription ack.
     *
     * if packet.id exist and this.subReqs[packet.id] exist then packet is a suback.
     * Subscription is request/response mode.
     * packet.id is pass from client in packet.messageId and record in Pinus context and attached to the subscribe response packet.
     * packet.body is the context that returned by subscribe next callback.
     *
     * if packet.id not exist then packet is a publish message.
     *
     * otherwise packet is a illegal packet.
     */
    publish(client: MQTTSocket, packet: {id: number , body: any}) {
        let mid = packet.id;
        let subreq = this.subReqs[mid];
        if (subreq) {
            // is suback
            client.socket.suback({ messageId: mid, granted: packet.body });
            delete this.subReqs[mid];
            return;
        }

        client.socket.publish(packet.body);
    }
}