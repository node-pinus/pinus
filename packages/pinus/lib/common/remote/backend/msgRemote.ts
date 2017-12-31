import * as utils from '../../../util/utils';
import { getLogger } from 'pinus-logger'; import { Application } from '../../../application';
import { BackendSession } from '../../service/backendSessionService';
 var logger = getLogger('forward-log', __filename);
/**
 * Remote service for backend servers.
 * Receive and handle request message forwarded from frontend server.
 */
export default function(app : Application) {
  return new MsgRemote(app);
};

export class MsgRemote
{
    app: Application;

    constructor(app : Application)
    {
        this.app = app;
    };

    /**
     * Forward message from frontend server to other server's handlers
     *
     * @param msg {Object} request message
     * @param session {Object} session object for current request
     * @param cb {Function} callback function
     */
    async forwardMessage(msg : any, session : BackendSession)
    {
        return new Promise<any>((resolve, reject) =>
        {
            var server = this.app.components.__server__;
            var sessionService = this.app.components.__backendSession__;

            if (!server)
            {
                logger.error('server component not enable on %s', this.app.serverId);
                reject(new Error('server component not enable'));
                return;
            }

            if (!sessionService)
            {
                logger.error('backend session component not enable on %s', this.app.serverId);
                reject(new Error('backend sesssion component not enable'));
                return;
            }

            // generate backend session for current request
            var backendSession = sessionService.create(session);

            // handle the request

            logger.debug('backend server [%s] handle message: %j', this.app.serverId, msg);

            server.handle(msg, backendSession, function (err, resp)
            {
                if (err)
                {
                    reject(err);
                }    
                else
                {
                    resolve(resp);
                }
            });
        });
    }

    /*
    forwardMessage2(route : string , body : any, aesPassword : string, compressGzip : boolean, session :BackendSession)
    {
        return new Promise<any>((resolve, reject) =>
        {
            var server = this.app.components.__server__;
            var sessionService = this.app.components.__backendSession__;

            if (!server)
            {
                logger.error('server component not enable on %s', this.app.serverId);
                reject(new Error('server component not enable'));
                return;
            }

            if (!sessionService)
            {
                logger.error('backend session component not enable on %s', this.app.serverId);
                reject(new Error('backend sesssion component not enable'));
                return;
            }

            // generate backend session for current request
            var backendSession = sessionService.create(session);

            // handle the request

            // logger.debug('backend server [%s] handle message: %j', this.app.serverId, msg);

            var dmsg = {
                route: route,
                body: body,
                compressGzip: compressGzip
            }

            var socket = {
                aesPassword: aesPassword
            }

            var connector = this.app.components.__connector__.connector;
            connector.runDecode(dmsg, socket, function (err : Error, msg : any)
            {
                if (err)
                {
                    return reject(err);
                }

                server.handle(msg, backendSession, function (err : Error, resp : any)
                {
                    if (err)
                    {
                        reject(err);
                    }    
                    else
                    {
                        resolve(resp);
                    }
                });
            });
        });    
    }*/
}