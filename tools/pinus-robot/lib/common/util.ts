import { EventEmitter } from 'events';

// ------------------------------------
// Statistics Manager
// ------------------------------------
//
// This file defines qputs, qprint, and extends the util namespace.
//
// Extends node.js util.js with other common functions.
//


let fs = require('fs');

export let getPath = function () {
    let path = './';
    if (__filename.indexOf('node_modules') === -1) {
        path = __filename.substring(0, __filename.lastIndexOf('/')) + '/../../log';
    } else {
        path = __filename.substring(0, __filename.lastIndexOf('node_modules')) + 'log';
    }
    return path;
};

export let createPath = function () {
    let path = getPath();
    if (!require('fs').existsSync(path)) {
        fs.mkdirSync(path);
    }
};

export let deleteLog = function () {
    let path = getPath();
    try {
        fs.unlinkSync(path + '/detail');
        fs.unlinkSync(path + '/.log');
    } catch (ex) {

    }
};

// A few common global functions so we can access them with as few keystrokes as possible
//

export let qputs = function (s: string) {
    console.log(s);
};

export let qprint = function (s: string) {
    console.log(s);
};


// Static utility methods
//
export let uid = function () {
    exports.lastUid_ = exports.lastUid_ || 0;
    return exports.lastUid_++;
};
export let defaults = function (obj: { [key: string]: any }, defaults: Array<any>) {
    for (let i in defaults) {
        if (obj[i] === undefined) {
            obj[i] = defaults[i];
        }
    }
    return obj;
};
export let extend = function (obj: { [key: string]: any }, extension: { [key: string]: any }) {
    for (let i in extension) {
        if (extension.hasOwnProperty(i)) {
            obj[i] = extension[i];
        }
    }
    return obj;
};

export let forEach = function (obj: { [key: string]: any }, f: (i: string, val: any) => void) {
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            f(i, obj[i]);
        }
    }
};

export let every = function (obj: { [key: string]: any }, f: (i: string, val: any) => void) {
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (!f(i, obj[i])) {
                return false;
            }
        }
    }
    return true;
};
export let argarray = function (args: Array<any>) {
    return Array.prototype.slice.call(args);
};
export let readStream = function (stream: any, callback: (data: string) => void) {
    let data: Array<any> = [];
    stream.on('data', function (chunk: any) {
        data.push(chunk.toString());
    });
    stream.on('end', function () {
        callback(data.join(''));
    });
};

/** Same arguments as http.createClient. Returns an wrapped http.Client object that will reconnect when
connection errors are detected. In the current implementation of http.Client (11/29/10), calls to
request() fail silently after the initial 'error' event. */
export let createReconnectingClient = function () {
    let http = require('http'),
        clientArgs = arguments, events = {}, client: any, wrappedClient: { [key: string]: any } = {},
        clientMethod = function (method: string) {
            return function () { return client[method].apply(client, arguments); };
        },
        clientGetter = function (member: string) { return function () { return client[member]; }; },
        clientSetter = function (member: string) { return function (val: string) { client[member] = val; }; },
        reconnect = function () {
            let oldclient = client;
            if (oldclient) { oldclient.destroy(); }
            client = http.createClient.apply(http, clientArgs);
            client._events = extend(events, client._events); // EventEmitter._events stores event handlers
            client.emit('reconnect', oldclient);
        };

    // Create initial http.Client
    reconnect();
    client.on('error', function (err: Error) { reconnect(); });

    // Wrap client so implementation can be swapped out when there are connection errors
    for (let j in client) {
        if (typeof client[j] === 'function') {
            wrappedClient[j] = clientMethod(j);
        } else {
            wrappedClient.__defineGetter__(j, clientGetter(j));
            wrappedClient.__defineSetter__(j, clientSetter(j));
        }
    }
    wrappedClient.impl = client;
    return wrappedClient;
};
