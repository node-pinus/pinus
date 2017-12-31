import { Package , Protocol } from 'pinus-protocol';
import { getLogger } from 'pinus-logger';
import { ISocket } from '../../interfaces/ISocket';
var logger = getLogger('pinus', __filename);

var handlers : {[packageType : number] : (socket : ISocket , pkg : any)=>void} = {};

var ST_INITED = 0;
var ST_WAIT_ACK = 1;
var ST_WORKING = 2;
var ST_CLOSED = 3;

var handleHandshake = function (socket : ISocket , pkg : any)
{
    if (socket.state !== ST_INITED)
    {
        return;
    }
    try
    {
        socket.emit('handshake', JSON.parse(Protocol.strdecode(pkg.body)));
    } catch (ex)
    {
        socket.emit('handshake', {});
    }
};

var handleHandshakeAck = function (socket : ISocket , pkg : any)
{
    if (socket.state !== ST_WAIT_ACK)
    {
        return;
    }
    socket.state = ST_WORKING;
    socket.emit('heartbeat');
};

var handleHeartbeat = function (socket : ISocket , pkg : any)
{
    if (socket.state !== ST_WORKING)
    {
        return;
    }
    socket.emit('heartbeat');
};

var handleData = function (socket : ISocket , pkg : any)
{
    if (socket.state !== ST_WORKING)
    {
        return;
    }
    socket.emit('message', pkg);
};

handlers[Package.TYPE_HANDSHAKE] = handleHandshake;
handlers[Package.TYPE_HANDSHAKE_ACK] = handleHandshakeAck;
handlers[Package.TYPE_HEARTBEAT] = handleHeartbeat;
handlers[Package.TYPE_DATA] = handleData;

export default function (socket : ISocket, pkg : any)
{
    var handler = handlers[pkg.type];
    if (!!handler)
    {
        handler(socket, pkg);
    } else
    {
        logger.error('could not find handle invalid data package.');
        socket.disconnect();
    }
};

