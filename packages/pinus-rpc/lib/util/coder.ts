import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'Coder');
import * as OutBuffer from './buffer/outputBuffer';
import * as InBuffer from './buffer/inputBuffer';
// import * as bBuffer from 'bearcat-buffer';
// let OutBuffer = bBuffer.outBuffer;
// let InBuffer = bBuffer.inBuffer;

export interface Msg {
    namespace: string;
    serverType: string;
    service: string;
    method: string;
    args: Array<string>;
}

export function encodeClient(id: number, msg: Msg, servicesMap: {[key: number]: any}) {
    // logger.debug('[encodeClient] id %s msg %j', id, msg);
    let outBuf = new OutBuffer.OutputBuffer();
    outBuf.writeUInt(id);
    let namespace = msg['namespace'];
    let serverType = msg['serverType'];
    let service = msg['service'];
    let method = msg['method'];
    let args = msg['args'] || [];
    outBuf.writeShort(servicesMap[0][namespace]);
    outBuf.writeShort(servicesMap[1][service]);
    outBuf.writeShort(servicesMap[2][method]);
    // outBuf.writeString(namespace);
    // outBuf.writeString(service);
    // outBuf.writeString(method);

    outBuf.writeObject(args);

    return outBuf.getBuffer();
}

export function encodeServer(id: number, args: object) {
    // logger.debug('[encodeServer] id %s args %j', id, args);
    let outBuf = new OutBuffer.OutputBuffer();
    outBuf.writeUInt(id);
    outBuf.writeObject(args);
    return outBuf.getBuffer();
}

export function decodeServer(buf: Buffer, servicesMap: {[key: number]: any}) {
    let inBuf = new InBuffer.InputBuffer(buf);
    let id = inBuf.readUInt();
    let namespace = servicesMap[3][inBuf.readShort()];
    let service = servicesMap[4][inBuf.readShort()];
    let method = servicesMap[5][inBuf.readShort()];
    // let namespace = inBuf.readString();
    // let service = inBuf.readString();
    // let method = inBuf.readString();

    let args = inBuf.readObject();
    // logger.debug('[decodeServer] namespace %s service %s method %s args %j', namespace, service, method, args)

    return {
        id: id,
        msg: {
            namespace: namespace,
            // serverType: serverType,
            service: service,
            method: method,
            args: args
        }
    };
}

export function decodeClient(buf: Buffer) {
    let inBuf = new InBuffer.InputBuffer(buf);
    let id = inBuf.readUInt();
    let resp = inBuf.readObject();
    // logger.debug('[decodeClient] id %s resp %j', id, resp);
    return {
        id: id,
        resp: resp
    };
}