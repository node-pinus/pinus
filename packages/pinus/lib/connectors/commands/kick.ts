import { Package } from 'pinus-protocol';
import { ISocket } from '../../interfaces/ISocket';
export function handle(socket: ISocket, reason: string) {
    // websocket close code 1000 would emit when client close the connection
    if (typeof reason === 'string') {
        let res = {
            reason: reason
        };
        socket.sendRaw(Package.encode(Package.TYPE_KICK, new Buffer(JSON.stringify(res))));
    }
}
