import { getLogger } from 'pinus-logger';
let logger = getLogger('pinus-rpc', 'blackhole');
import { EventEmitter } from 'events';
import * as utils from '../../util/utils';
import { Tracer } from '../../util/tracer';

export class Blackhole extends EventEmitter {
    connect(tracer: Tracer, cb: (parameter: Error) => void) {
        tracer && tracer.info('client', __filename, 'connect', 'connect to blackhole');
        process.nextTick(function () {
            cb(new Error('fail to connect to remote server and switch to blackhole.'));
        });
    }

    close(cb: Function) { }

    send(tracer: Tracer, msg: object, opts: object, cb: Function) {
        tracer && tracer.info('client', __filename, 'send', 'send rpc msg to blackhole');
        logger.info('message into blackhole: %j', msg);
        process.nextTick(function () {
            cb(tracer, new Error('message was forward to blackhole.'));
        });
    }
}