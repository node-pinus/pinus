
import { Actor } from 'pinus-robot';
import { PinusWSClient, PinusWSClientEvent} from 'pinus-robot-plugin';


export class Robot {
    constructor(private actor: Actor) {

    }

    openid = String(Math.round(Math.random() * 1000));

    pinusClient = new PinusWSClient();

    public connectGate(): void {

        let host = '127.0.0.1';
        let port = '3014';
        this.pinusClient.on(PinusWSClientEvent.EVENT_IO_ERROR, (event) => {
            // 错误处理
            console.error('error', event);
        });
        this.pinusClient.on(PinusWSClientEvent.EVENT_CLOSE, function(event) {
            // 关闭处理
            console.error('close', event);
        });
        this.pinusClient.on(PinusWSClientEvent.EVENT_HEART_BEAT_TIMEOUT, function(event) {
            // 心跳timeout
            console.error('heart beat timeout', event);
        });
        this.pinusClient.on(PinusWSClientEvent.EVENT_KICK, function(event) {
            // 踢出
            console.error('kick', event);
        });

        // this.actor.emit("incr" , "gateConnReq");
        this.actor.emit('start' , 'gateConn' , this.actor.id);
        this.pinusClient.init({
            host: host,
            port: port
        }, () => {
            this.actor.emit('end' , 'gateConn' , this.actor.id);
            // 连接成功执行函数
            console.log('gate连接成功');


            this.gateQuery();
        });
    }
    gateQuery() {
        // this.actor.emit("incr" , "gateQueryReq");
        this.actor.emit('start' , 'gateQuery' , this.actor.id);
        this.pinusClient.request('gate.gateHandler.queryEntry', {uid: this.openid} , (result: {code: number , host: string , port: number}) => {
            // 消息回调
            // console.log("gate返回",JSON.stringify(result));
            this.actor.emit('end' , 'gateQuery' , this.actor.id);
            this.pinusClient.disconnect();
            this.connectToConnector(result);
        });
    }

    connectToConnector(result: {host: string , port: number}) {
        // this.actor.emit("incr" , "loginConnReq");
        this.actor.emit('start' , 'loginConn' , this.actor.id);
        this.pinusClient.init({
            host: result.host,
            port: result.port
        }, () => {
            this.actor.emit('end' , 'loginConn' , this.actor.id);
            // 连接成功执行函数
            console.log('connector连接成功');

            this.loginQuery({rid: this.actor.id.toString() , username : this.actor.id.toString()});
        });
    }

    loginQuery(result: {rid: string, username: string}) {

        // this.actor.emit("incr" , "loginQueryReq");
        this.actor.emit('start' , 'loginQuery' , this.actor.id);
        this.pinusClient.request('connector.entryHandler.enter', result , (ret: any) => {
            // 消息回调
            this.actor.emit('end' , 'loginQuery' , this.actor.id);
            console.log('connector返回', JSON.stringify(result));


            setTimeout(() =>
            this.loginQuery(result) , Math.random() * 5000 + 1000);
        });
    }
}

export default function(actor: Actor) {
    let client = new Robot(actor);
    client.connectGate();
    return client;
}
