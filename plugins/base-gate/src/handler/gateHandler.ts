
import { Application, ServerInfo, FrontendSession } from "pinus";
import { createHash } from "crypto";
import { Code, ConnectorHost, common } from "../common";


// 网关处理
export class gateHandler
{
    constructor(private app: Application)
    {

    }

    
    hashDispatch(id: string, servers: ServerInfo[])
    {
        if (servers.length === 0)
        {
            return;
        }

        if (id === null || id === undefined)
        {
            return servers[0];
        }

        if (typeof (id) !== 'string')
        {
            id = String(id);
        }
        var md5 = createHash('md5').update(id).digest('hex');
        var hash = parseInt(md5.substr(0, 8), 16);

        return servers[hash % servers.length];
    };

    // 查询该用哪个connector
    public async queryEntry(msg: { openid: string }, session: FrontendSession) : Promise<ConnectorHost>
    {
        //console.log("queryEntry" + msg.openid);
        var openid = msg.openid;
        if (!openid)
        {
           return {code:Code.FAIL};
        }

        var connectors = this.app.getServersByType('connector');
        if (!connectors || connectors.length === 0)
        {
            return {code:Code.FA_NO_SERVER_AVAILABLE};
        }

        var res = this.hashDispatch(openid, connectors);
        var connectorHost = {code: Code.OK, host: res.clientHost, port: res.clientPort, openid: openid, hash: "" };
        // 计算出hash给connector验证
        connectorHost.hash = common.calcConnectorHostHash(connectorHost);
        return connectorHost;
    };
}

export default function(app : Application)
{
    return new gateHandler(app)
}
