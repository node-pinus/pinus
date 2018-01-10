import { Message } from 'pinus-protocol';
import * as  Constants from '../../util/constants';
import { getLogger } from 'pinus-logger';
import { IConnector } from '../../interfaces/IConnector';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


let encode = function (this: IConnector ,  reqId: number, route: string, msg: any) {
    if (!!reqId) {
        return composeResponse(this, reqId, route, msg);
    } else {
        return composePush(this, route, msg);
    }
};

let decode = function (this: any ,  msg: any) {
    msg = Message.decode(msg.body);
    let route = msg.route;

    // decode use dictionary
    if (!!msg.compressRoute) {
        if (!!this.connector.useDict) {
            let abbrs = this.dictionary.getAbbrs();
            if (!abbrs[route]) {
                logger.error('dictionary error! no abbrs for route : %s', route);
                return null;
            }
            route = msg.route = abbrs[route];
        } else {
            logger.error('fail to uncompress route code for msg: %j, server not enable dictionary.', msg);
            return null;
        }
    }

    // decode use protobuf
    if (!!this.protobuf && !!this.protobuf.getProtos().client[route]) {
        msg.body = this.protobuf.decode(route, msg.body);
    } else if (!!this.decodeIO_protobuf && !!this.decodeIO_protobuf.check(Constants.RESERVED.CLIENT, route)) {
        msg.body = this.decodeIO_protobuf.decode(route, msg.body);
    } else {
        try {
            msg.body = JSON.parse(msg.body.toString('utf8'));
        } catch (ex) {
            msg.body = {};
        }
    }

    return msg;
};

let composeResponse = function (server: any, msgId: number, route: string, msgBody: any) {
    if (!msgId || !route || !msgBody) {
        return null;
    }
    msgBody = encodeBody(server, route, msgBody);
    return Message.encode(msgId, Message.TYPE_RESPONSE, false, null, msgBody);
};

let composePush = function (server: any, route: string, msgBody: any) {
    if (!route || !msgBody) {
        return null;
    }
    msgBody = encodeBody(server, route, msgBody);
    // encode use dictionary
    let compressRoute = false;
    if (!!server.dictionary) {
        let dict = server.dictionary.getDict();
        if (!!server.connector.useDict && !!dict[route]) {
            route = dict[route];
            compressRoute = true;
        }
    }
    return Message.encode(0, Message.TYPE_PUSH, compressRoute, route, msgBody);
};

let encodeBody = function (server: any, route: string, msgBody: any) {
    // encode use protobuf
    if (!!server.protobuf && !!server.protobuf.getProtos().server[route]) {
        msgBody = server.protobuf.encode(route, msgBody);
    } else if (!!server.decodeIO_protobuf && !!server.decodeIO_protobuf.check(Constants.RESERVED.SERVER, route)) {
        msgBody = server.decodeIO_protobuf.encode(route, msgBody);
    } else {
        msgBody = new Buffer(JSON.stringify(msgBody), 'utf8');
    }
    return msgBody;
};

export
{
    encode,
    decode
};