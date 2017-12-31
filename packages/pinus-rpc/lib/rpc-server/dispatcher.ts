import { EventEmitter } from 'events';
import * as utils from '../util/utils';
import * as util from 'util';
import {Tracer} from '../util/tracer'

export interface MsgPkg{
    namespace: string,
    method: string,
    args: any,
    service: string
}

export class Dispatcher extends EventEmitter
{
    services: { [key: string]: { [key: string]: { [key: string]: Function } } };
    constructor(services: { [key: string]: { [key: string]: { [key: string]: Function } } })
    {
        super();
        var self = this;
        this.on('reload', function (services)
        {
            self.services = services;
        });
        this.services = services;
    };


    /**
     * route the msg to appropriate service object
     *
     * @param msg msg package {service:serviceString, method:methodString, args:[]}
     * @param services services object collection, such as {service1: serviceObj1, service2: serviceObj2}
     * @param cb(...) callback function that should be invoked as soon as the rpc finished
     */
    route(tracer: Tracer, msg: MsgPkg, cb: Function)
    {
        tracer && tracer.info('server', __filename, 'route', 'route messsage to appropriate service object');
        var namespace = this.services[msg.namespace];
        if (!namespace)
        {
            tracer && tracer.error('server', __filename, 'route', 'no such namespace:' + msg.namespace);
            cb(new Error('no such namespace:' + msg.namespace));
            return;
        }

        var service = namespace[msg.service];
        if (!service)
        {
            tracer && tracer.error('server', __filename, 'route', 'no such service:' + msg.service);
            cb(new Error('no such service:' + msg.service));
            return;
        }

        var method = service[msg.method];
        if (!method)
        {
            tracer && tracer.error('server', __filename, 'route', 'no such method:' + msg.method);
            cb(new Error('no such method:' + msg.method));
            return;
        }

        var args = msg.args;
        var promise = method.apply(service, args);
        if (promise == undefined || !promise || !promise.then)
        {
            tracer && tracer.error('server', __filename, 'route', 'not async method:' + msg.method);
            cb(new Error('not async method:' + msg.method));
            return;
        }
        promise.then(function (value: string)
        {
            cb(null, value);
        }, function (reason: Error)
            {
                cb(reason);
            });
    };
}