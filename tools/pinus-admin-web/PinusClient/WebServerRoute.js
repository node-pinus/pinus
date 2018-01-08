const net = require('net');
const MqttCon = require('mqtt-connection');
const config = require('./../config/admin');
const websocket = require('websocket-stream');
const protcol = require('./protocol');
const WebSocketServer = require('ws').Server;
const adminClient = require('./Client');

var client = null;
function WebServer()
{
    const wss = new WebSocketServer({port: config.webPort});
    wss.on('connection', function (ws) {
        const stream = websocket(ws);
        const socket = MqttCon(stream);

        socket.on('connect', function(pkg) {
            socket.connack({
                returnCode: 0
            });
        });

        socket.on('publish', function(pkg)
        {
            const topic = pkg.topic;
            var msg = pkg.payload.toString();
            msg = JSON.parse(msg);
            msg = protcol.parse(msg);
            if (topic === 'register')
            {
                msg['host'] = config.host;
                msg['port'] = config.port;
                connectToMaster(msg.id, msg);
            }
            else
            {
                if (client === null)
                {
                    socket.removeAllListeners();
                    socket.disconnect();
                    socket.destroy();
                    return;
                }
                (function (msg, topic, socket)
                {
                    const moduleId = msg.moduleId;
                    const body = msg.body;
                    var command = body.command;
                    if (command)
                    {
                        command = {command:command};
                    }
                    client.request(moduleId, command, (err,data) =>
                    {
                        if (data)
                        {
                            const payload = protcol.composeResponse(msg, err, data);
                            if (payload)
                            {
                                socket.publish({
                                    topic: topic,
                                    payload: payload
                                });
                            }

                        }
                        else
                        {
                            console.info(msg);
                        }
                    })
                })(msg, topic, socket);
            }
        });

        socket.on('pingreq', function() {
            socket.pingresp();
        });
    })
}

function connectToMaster(id, opts) {
    client = new adminClient({username: opts.username, password: opts.password, md5: opts.md5});
    client.connect(id, opts.host, opts.port,function(err)
    {
        if(err) {
            client = null;
            console.error(err);
            process.exit(1);
        }
    });
    client.on('error', function ()
    {
        client = null;
    });
    client.on('close', function ()
    {
        client = null;
    });
    client.on('disconnect', function()
    {
        client = null;
    });
}

module.exports = WebServer;