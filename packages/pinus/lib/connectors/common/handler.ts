import { Package , Protocol } from 'pinus-protocol';
import { getLogger } from 'pinus-logger';
import { ISocket } from '../../interfaces/ISocket';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


let handlers: {[packageType: number]: (socket: ISocket , pkg: any) => void} = {};

let ST_INITED = 0;
let ST_WAIT_ACK = 1;
let ST_WORKING = 2;
let ST_CLOSED = 3;

let handleHandshake = function (socket: ISocket , pkg: any) {
    if (socket.state !== ST_INITED) {
        return;
    }
    try {
        socket.emit('handshake', JSON.parse(Protocol.strdecode(pkg.body)));
    } catch (ex) {
        socket.emit('handshake', {});
    }
};

let handleHandshakeAck = function (socket: ISocket , pkg: any) {
    if (socket.state !== ST_WAIT_ACK) {
        return;
    }
    socket.state = ST_WORKING;
    socket.emit('heartbeat');
};

let handleHeartbeat = function (socket: ISocket , pkg: any) {
    if (socket.state !== ST_WORKING) {
        return;
    }
    socket.emit('heartbeat');
};

let handleData = function (socket: ISocket , pkg: any) {
    if (socket.state !== ST_WORKING) {
        return;
    }
    socket.emit('message', pkg);
};

handlers[Package.TYPE_HANDSHAKE] = handleHandshake;
handlers[Package.TYPE_HANDSHAKE_ACK] = handleHandshakeAck;
handlers[Package.TYPE_HEARTBEAT] = handleHeartbeat;
handlers[Package.TYPE_DATA] = handleData;

export default function (socket: ISocket, pkg: any) {
    let handler = handlers[pkg.type];
    if (!!handler) {
        handler(socket, pkg);
    } else {
        logger.error('could not find handle invalid data package.');
        socket.disconnect();
    }
}

