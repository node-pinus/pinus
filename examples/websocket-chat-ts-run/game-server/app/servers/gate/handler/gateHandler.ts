import { dispatch } from '../../../util/dispatcher';
import {Application, BackendSession, FrontendSession} from 'pinus';
import { Injectable } from '@nestjs/common';
import { getNestClass } from '../../../util/nestutil';

export default function (app: Application) {
    return getNestClass(app, GateHandler);
}

@Injectable()
export class GateHandler {
    constructor(private app: Application) {
    }

    /**
     * Gate handler that dispatch user to connectors.
     *
     * @param {Object} msg message from client
     * @param {Object} session
     *
     */
    async queryEntry(msg: { uid: string }, session: BackendSession) {
        let uid = msg.uid;
        if (!uid) {
            return {
                code: 500
            };
        }
        // get all connectors
        let connectors = this.app.getServersByType('connector');
        if (!connectors || connectors.length === 0) {
            return {
                code: 500
            };
        }
        // select connector
        let res = dispatch(uid, connectors);
        return {
            code: 200,
            host: res.host,
            port: res.clientPort
        };
    }
    
    /**
     * protobuftest include obj and map
     * @param msg
     * @param session
     */
    async protobufTest(msg: { username: string, obj:{[key: string]: {a: string, b: number, c: boolean}},map:Map<string, {d: string, e: number, f: boolean}> }, session: FrontendSession){
        console.log(msg);
        return msg;
    }
}