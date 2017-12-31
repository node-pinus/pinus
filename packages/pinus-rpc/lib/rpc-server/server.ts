import * as Loader from 'pinus-loader';
import * as Gateway from './gateway';

 let loadRemoteServices = function (paths: Array<Gateway.RemoteServerCode>, context: object): object
{
    let res: {[key:string]: any} = {},
        item, m: {[key:string]: any};
    for (let i = 0, l = paths.length; i < l; i++)
    {
        item = paths[i];
        m = Loader.load(item.path, context);

        if (m)
        {
            createNamespace(item.namespace, res);
            for (let s in m)
            {
                res[item.namespace][s] = m[s];
            }
        }
    }

    return res;
};

let createNamespace = function (namespace: string, proxies: {[key:string]: any})
{
    proxies[namespace] = proxies[namespace] || {};
};

/**
 * Create rpc server.
 *
 * @param  {Object}      opts construct parameters
 *                       opts.port {Number|String} rpc server listen port
 *                       opts.paths {Array} remote service code paths, [{namespace, path}, ...]
 *                       opts.context {Object} context for remote service
 *                       opts.acceptorFactory {Object} (optionals)acceptorFactory(opts, cb)
 * @return {Object}      rpc server instance
 */

export function createServer(opts: Gateway.RpcServerOpts)
{
    if (!opts || !opts.port || opts.port < 0 || !opts.paths)
    {
        throw new Error('opts.port or opts.paths invalid.');
    }
    let services = loadRemoteServices(opts.paths, opts.context);
    opts.services = services;
    let gateway = Gateway.createGateway(opts);
    return gateway;
};

// module.exports.WSAcceptor from ('./acceptors/ws-acceptor');
// module.exports.TcpAcceptor from ('./acceptors/tcp-acceptor');
export { create as MqttAcceptor } from './acceptors/mqtt-acceptor';