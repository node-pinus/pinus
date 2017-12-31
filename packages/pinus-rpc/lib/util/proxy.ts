import { getLogger } from 'pinus-logger'
import { listEs6ClassMethods } from './utils';
let logger = getLogger('pinus-rpc', 'rpc-proxy');

/**
 * Create proxy.
 *
 * @param  {Object} opts construct parameters
 *           opts.origin {Object} delegated object
 *           opts.proxyCB {Function} proxy invoke callback
 *           opts.service {String} deletgated service name
 *           opts.attach {Object} attach parameter pass to proxyCB
 * @return {Object}      proxy instance
 */
export function create(opts : {origin : any , proxyCB : ProxyCallback , service : string , attach : any})
{
    if (!opts || !opts.origin)
    {
        logger.warn('opts and opts.origin should not be empty.');
        return null;
    }

    if (!opts.proxyCB || typeof opts.proxyCB !== 'function')
    {
        logger.warn('opts.proxyCB is not a function, return the origin module directly.');
        return opts.origin;
    }

    return genObjectProxy(opts.service, opts.origin, opts.attach, opts.proxyCB);
};

let genObjectProxy = function (serviceName : string, origin : any, attach : any, proxyCB : ProxyCallback)
{
    //generate proxy for function field
    let res : {[key:string] : Proxy} = {};
    let proto = listEs6ClassMethods(origin);
    for (let field of proto)
    {
        res[field] = genFunctionProxy(serviceName, field, origin, attach, proxyCB);
    }

    return res;
};

export interface Proxy
{
    (...args:any[]):Promise<any>;
    toServer(serverId:string , ...args:any[]):Promise<any>;
}

export type ProxyCallback = (serviceName : string, methodName : string, args : any[], attach : any, isToSpecifiedServer ?: boolean)=>Promise<any>;
/**
 * Generate prxoy for function type field
 *
 * @param namespace {String} current namespace
 * @param serverType {String} server type string
 * @param serviceName {String} delegated service name
 * @param methodName {String} delegated method name
 * @param origin {Object} origin object
 * @param proxyCB {Functoin} proxy callback function
 * @returns function proxy
 */
let genFunctionProxy = function (serviceName : string, methodName : string, origin : any, attach : boolean, proxyCB : ProxyCallback)
{
    return (function () : Proxy
    {
        let proxy : any = function ()
        {
            // let args = arguments;
            let len = arguments.length;
            let args = new Array(len);
            for (let i = 0; i < len; i++)
            {
                args[i] = arguments[i];
            }
            // let args = Array.prototype.slice.call(arguments, 0);
            return proxyCB(serviceName, methodName, args, attach);
        };

        proxy.toServer = function ()
        {
            // let args = arguments;
            let len = arguments.length;
            let args = new Array(len);
            for (let i = 0; i < len; i++)
            {
                args[i] = arguments[i];
            }
            return proxyCB(serviceName, methodName, args, attach, true);
        };

        return proxy;
    })();
};