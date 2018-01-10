import { Package } from 'pinus-protocol';
import { getLogger } from 'pinus-logger';
import { ISocket } from '../../interfaces/ISocket';
import * as path from 'path';
let logger = getLogger('pinus', path.basename(__filename));


export interface HeartbeatCommandOptions {
    disconnectOnTimeout?: boolean;
    heartbeat?: number;
    timeout?: number;
}

/**
 * Process heartbeat request.
 *
 * @param {Object} opts option request
 *                      opts.heartbeat heartbeat interval
 */
export class HeartbeatCommand {
    heartbeat: number;
    timeout: number;
    disconnectOnTimeout: boolean;
    timeouts: { [socketId: number]: NodeJS.Timer } = {};
    clients: { [socketId: number]: number } = {};
    constructor(opts?: HeartbeatCommandOptions) {
        opts = opts || {};
        this.disconnectOnTimeout = opts.disconnectOnTimeout;

        if (opts.heartbeat) {
            this.heartbeat = opts.heartbeat * 1000; // heartbeat interval
            this.timeout = opts.timeout * 1000 || this.heartbeat * 2;      // max heartbeat message timeout
            this.disconnectOnTimeout = true;
        }

    }

    handle(socket: ISocket) {
        if (!this.heartbeat) {
            // no heartbeat setting
            return;
        }

        let self = this;

        if (!this.clients[socket.id]) {
            // clear timers when socket disconnect or error
            this.clients[socket.id] = 1;
            socket.once('disconnect', this.clearTimers.bind(this, socket.id));
            socket.once('error', this.clearTimers.bind(this, socket.id));
        }

        // clear timeout timer
        if (self.disconnectOnTimeout) {
            this.clear(socket.id);
        }

        socket.sendRaw(Package.encode(Package.TYPE_HEARTBEAT));

        if (self.disconnectOnTimeout) {
            self.timeouts[socket.id] = setTimeout(function () {
                logger.info('client %j heartbeat timeout.', socket.id);
                socket.disconnect();
            }, self.timeout);
        }
    }

    clear(id: number) {
        let tid = this.timeouts[id];
        if (tid) {
            clearTimeout(tid);
            delete this.timeouts[id];
        }
    }
    clearTimers(id: number) {
        delete this.clients[id];
        let tid = this.timeouts[id];
        if (tid) {
            clearTimeout(tid);
            delete this.timeouts[id];
        }
    }
}