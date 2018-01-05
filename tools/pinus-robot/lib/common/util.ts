import { EventEmitter } from "events";

// ------------------------------------
// Statistics Manager
// ------------------------------------
//
// This file defines qputs, qprint, and extends the util namespace.
//
// Extends node.js util.js with other common functions.
//
let BUILD_AS_SINGLE_FILE;
if (!BUILD_AS_SINGLE_FILE)
{
    var util = require('util');
}

let fs = require('fs');

util.getPath = function ()
{
    let path = "./";
    if (__filename.indexOf('node_modules') == -1)
    {
        path = __filename.substring(0, __filename.lastIndexOf('/')) + '/../../log';
    } else
    {
        path = __filename.substring(0, __filename.lastIndexOf('node_modules')) + 'log';
    }
    return path;
};

util.createPath = function ()
{
    let path = util.getPath();
    if (!require('fs').existsSync(path))
    {
        fs.mkdirSync(path);
    }
};

util.deleteLog = function ()
{
    let path = util.getPath();
    try
    {
        fs.unlinkSync(path + '/detail');
        fs.unlinkSync(path + '/.log');
    } catch (ex)
    {

    }
}

// A few common global functions so we can access them with as few keystrokes as possible
//
let qputs = util.qputs = function (s: string)
{
    util.puts(s);
};

let qprint = util.qprint = function (s: string)
{
    util.print(s);
};


// Static utility methods
//
util.uid = function ()
{
    exports.lastUid_ = exports.lastUid_ || 0;
    return exports.lastUid_++;
};
util.defaults = function (obj: { [key: string]: any }, defaults: Array<any>)
{
    for (let i in defaults)
    {
        if (obj[i] === undefined)
        {
            obj[i] = defaults[i];
        }
    }
    return obj;
};
util.extend = function (obj: { [key: string]: any }, extension: { [key: string]: any })
{
    for (let i in extension)
    {
        if (extension.hasOwnProperty(i))
        {
            obj[i] = extension[i];
        }
    }
    return obj;
};

util.forEach = function (obj: { [key: string]: any }, f: (i: string, val: any) => void)
{
    for (let i in obj)
    {
        if (obj.hasOwnProperty(i))
        {
            f(i, obj[i]);
        }
    }
};

util.every = function (obj: { [key: string]: any }, f: (i: string, val: any) => void)
{
    for (let i in obj)
    {
        if (obj.hasOwnProperty(i))
        {
            if (!f(i, obj[i]))
            {
                return false;
            }
        }
    }
    return true;
};
util.argarray = function (args: Array<any>)
{
    return Array.prototype.slice.call(args);
};
util.readStream = function (stream: any, callback: (data: string) => void)
{
    let data: Array<any> = [];
    stream.on('data', function (chunk: any)
    {
        data.push(chunk.toString());
    });
    stream.on('end', function ()
    {
        callback(data.join(''));
    });
};

/** Make an object a PeriodicUpdater by adding PeriodicUpdater.call(this) to the constructor.
The object will call this.update() every interval. */
util.PeriodicUpdater = function (updateIntervalMs: number)
{
    let self = this, updateTimeoutId: NodeJS.Timer;
    this.__defineGetter__('updateInterval', function () { return updateIntervalMs; });
    this.__defineSetter__('updateInterval', function (milliseconds: number)
    {
        clearInterval(updateTimeoutId);
        if (milliseconds > 0 && milliseconds < Infinity)
        {
            updateTimeoutId = setInterval(self.update.bind(self), milliseconds);
        }
        updateIntervalMs = milliseconds;
    });
    this.updateInterval = updateIntervalMs;
};

/** Same arguments as http.createClient. Returns an wrapped http.Client object that will reconnect when
connection errors are detected. In the current implementation of http.Client (11/29/10), calls to
request() fail silently after the initial 'error' event. */
util.createReconnectingClient = function ()
{
    let http = require('http'),
        clientArgs = arguments, events = {}, client: any, wrappedClient: { [key: string]: any } = {},
        clientMethod = function (method: string)
        {
            return function () { return client[method].apply(client, arguments); };
        },
        clientGetter = function (member: string) { return function () { return client[member]; }; },
        clientSetter = function (member: string) { return function (val: string) { client[member] = val; }; },
        reconnect = function ()
        {
            let oldclient = client;
            if (oldclient) { oldclient.destroy(); }
            client = http.createClient.apply(http, clientArgs);
            client._events = util.extend(events, client._events); // EventEmitter._events stores event handlers
            client.emit('reconnect', oldclient);
        };

    // Create initial http.Client
    reconnect();
    client.on('error', function (err: Error) { reconnect(); });

    // Wrap client so implementation can be swapped out when there are connection errors
    for (let j in client)
    {
        if (typeof client[j] === 'function')
        {
            wrappedClient[j] = clientMethod(j);
        } else
        {
            wrappedClient.__defineGetter__(j, clientGetter(j));
            wrappedClient.__defineSetter__(j, clientSetter(j));
        }
    }
    wrappedClient.impl = client;
    return wrappedClient;
};

/** Accepts an EventEmitter object that emits text data. LineReader buffers the text and emits a 'data'
event each time a newline is encountered. For example, */
util.LineReader = function (eventEmitter: EventEmitter, event: string)
{
    EventEmitter.call(this);
    event = event || 'data';

    let self = this, buffer = '';

    let emitLine = function (buffer: string)
    {
        let lineEnd = buffer.indexOf("\n");
        let line = (lineEnd === -1) ? buffer : buffer.substring(0, lineEnd);
        if (line) { self.emit('data', line); }
        return buffer.substring(line.length + 1, buffer.length);
    };

    let readloop = function (this: any, data: any)
    {
        if (data) { buffer += data.toString(); }
        if (buffer.indexOf("\n") > -1)
        {
            buffer = emitLine(buffer);
            process.nextTick(readloop.bind(this));
        }
    };

    eventEmitter.on(event, readloop.bind(this));
}
util.inherits(util.LineReader, EventEmitter);

util.extend(exports, util);
