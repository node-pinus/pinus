import { pinus } from '../../pinus';
import { Package } from 'pinus-protocol';
import { ISocket } from '../../interfaces/ISocket';

var CODE_OK = 200;
var CODE_USE_ERROR = 500;
var CODE_OLD_CLIENT = 501;

export type HanshakeFunction = (msg : any , cb : (err ?: Error , resp ?: any)=>void , socket : ISocket)=>void;

export interface HandshakeCommandOptions
{
    handshake ?: HanshakeFunction;
    heartbeat ?: number;
    checkClient ?: boolean;
    useDict ?: boolean;
    useProtobuf ?: boolean;
    useCrypto ?: boolean;
}

/**
 * Process the handshake request.
 *
 * @param {Object} opts option parameters
 *                      opts.handshake(msg, cb(err, resp)) handshake callback. msg is the handshake message from client.
 *                      opts.hearbeat heartbeat interval (level?)
 *                      opts.version required client level
 */
export class HandshakeCommand
{
    userHandshake: HanshakeFunction;
    heartbeatSec: number;
    heartbeat: number;
    checkClient: boolean;
    useDict: boolean;
    useProtobuf: boolean;
    useCrypto: boolean;

    constructor(opts : HandshakeCommandOptions)
    {
        opts = opts || {};
        this.userHandshake = opts.handshake;

        if (opts.heartbeat)
        {
            this.heartbeatSec = opts.heartbeat;
            this.heartbeat = opts.heartbeat * 1000;
        }

        this.checkClient = opts.checkClient;

        this.useDict = opts.useDict;
        this.useProtobuf = opts.useProtobuf;
        this.useCrypto = opts.useCrypto;
    };

    handle(socket : ISocket, msg : any)
    {
        if (!msg.sys)
        {
            processError(socket, CODE_USE_ERROR);
            return;
        }

        if (typeof this.checkClient === 'function')
        {
            if (!msg || !msg.sys || !this.checkClient(msg.sys.type, msg.sys.version))
            {
                processError(socket, CODE_OLD_CLIENT);
                return;
            }
        }

        var opts : any = {
            heartbeat: setupHeartbeat(this)
        };

        if (this.useDict)
        {
            var dictVersion = pinus.app.components.__dictionary__.getVersion();
            if (!msg.sys.dictVersion || msg.sys.dictVersion !== dictVersion)
            {

                // may be deprecated in future
                opts.dict = pinus.app.components.__dictionary__.getDict();

                opts.routeToCode = pinus.app.components.__dictionary__.getDict();
                opts.codeToRoute = pinus.app.components.__dictionary__.getAbbrs();
                opts.dictVersion = dictVersion;
            }
            opts.useDict = true;
        }

        if (this.useProtobuf)
        {
            var protoVersion = pinus.app.components.__protobuf__.getVersion();
            if (!msg.sys.protoVersion || msg.sys.protoVersion !== protoVersion)
            {
                opts.protos = pinus.app.components.__protobuf__.getProtos();
            }
            opts.useProto = true;
        }

        if (!!pinus.app.components.__decodeIO__protobuf__)
        {
            if (!!this.useProtobuf)
            {
                throw new Error('protobuf can not be both used in the same project.');
            }
            var component = pinus.app.components.__decodeIO__protobuf__ as any;
            var version = component.getVersion();
            if (!msg.sys.protoVersion || msg.sys.protoVersion < version)
            {
                opts.protos = component.getProtos();
            }
            opts.useProto = true;
        }

        if (this.useCrypto)
        {
            pinus.app.components.__connector__.setPubKey(socket.id, msg.sys.rsa);
        }

        if (typeof this.userHandshake === 'function')
        {
            this.userHandshake(msg, function (err, resp)
            {
                if (err)
                {
                    process.nextTick(function ()
                    {
                        processError(socket, CODE_USE_ERROR);
                    });
                    return;
                }
                process.nextTick(function ()
                {
                    response(socket, opts, resp);
                });
            }, socket);
            return;
        }

        process.nextTick(function ()
        {
            response(socket, opts);
        });
    };

}

var setupHeartbeat = function (self : HandshakeCommand)
{
    return self.heartbeatSec;
};

var response = function (socket : ISocket, sys : any, resp ?: any)
{
    var res : any = {
        code: CODE_OK,
        sys: sys
    };
    if (resp)
    {
        res.user = resp;
    }
    socket.handshakeResponse(Package.encode(Package.TYPE_HANDSHAKE, new Buffer(JSON.stringify(res))));
};

var processError = function (socket : ISocket, code : number)
{
    var res = {
        code: code
    };
    socket.sendForce(Package.encode(Package.TYPE_HANDSHAKE, new Buffer(JSON.stringify(res))));
    process.nextTick(function ()
    {
        socket.disconnect();
    });
};
