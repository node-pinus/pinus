// ------------------------------------
// Statistics Manager
// ------------------------------------
//
// This file defines qputs, qprint, and extends the util namespace.
//
// Extends node.js util.js with other common functions.
//
var BUILD_AS_SINGLE_FILE;
if (!BUILD_AS_SINGLE_FILE) {
var util = require('util');
var EventEmitter = require('events').EventEmitter;
}

var fs = require('fs');

util.getPath = function() {
    var path = "./";
    if (__filename.indexOf('node_modules')==-1) {
        path =  __filename.substring(0,__filename.lastIndexOf('/')) + '/../../log';
    } else {
        path = __filename.substring(0,__filename.lastIndexOf('node_modules')) + 'log';
    }
    return path;
};

util.createPath = function() {
    var path = util.getPath();
    if (!require('fs').existsSync(path)) { 
        fs.mkdirSync(path);
    }
};

util.deleteLog = function() {
    var path = util.getPath();
    try {
        fs.unlinkSync(path+'/detail');
        fs.unlinkSync(path+'/.log');
    } catch(ex){
        
    }
}

// A few common global functions so we can access them with as few keystrokes as possible
//
var qputs = util.qputs = function(s) {
	 util.puts(s); 
};

var qprint = util.qprint = function(s) {
	 util.print(s); 
};


// Static utility methods
//
util.uid = function() {
    exports.lastUid_ = exports.lastUid_ || 0;
    return exports.lastUid_++;
};
util.defaults = function(obj, defaults) {
    for (var i in defaults) {
        if (obj[i] === undefined) {
            obj[i] = defaults[i];
        }
    }
    return obj;
};
util.extend = function(obj, extension) {
    for (var i in extension) {
        if (extension.hasOwnProperty(i)) {
            obj[i] = extension[i];
        }
    }
    return obj;
};

util.forEach = function(obj, f) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            f(i, obj[i]);
        }
    }
};

util.every = function(obj, f) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (!f(i, obj[i])) {
                return false;
            }
        }
    }
    return true;
};
util.argarray = function(args) {
    return Array.prototype.slice.call(args);
};
util.readStream = function(stream, callback) {
    var data = [];
    stream.on('data', function(chunk) {
        data.push(chunk.toString());
    });
    stream.on('end', function() {
        callback(data.join(''));
    });
};

/** Make an object a PeriodicUpdater by adding PeriodicUpdater.call(this) to the constructor.
The object will call this.update() every interval. */
util.PeriodicUpdater = function(updateIntervalMs) {
    var self = this, updateTimeoutId;
    this.__defineGetter__('updateInterval', function() { return updateIntervalMs; });
    this.__defineSetter__('updateInterval', function(milliseconds) {
        clearInterval(updateTimeoutId);
        if (milliseconds > 0 && milliseconds < Infinity) {
            updateTimeoutId = setInterval(self.update.bind(self), milliseconds);
        }
        updateIntervalMs = milliseconds;
    });
    this.updateInterval = updateIntervalMs;
};

/** Same arguments as http.createClient. Returns an wrapped http.Client object that will reconnect when
connection errors are detected. In the current implementation of http.Client (11/29/10), calls to
request() fail silently after the initial 'error' event. */
util.createReconnectingClient = function() {
    var http = require('http'),
        clientArgs = arguments, events = {}, client, wrappedClient = {},
        clientMethod = function(method) { 
            return function() { return client[method].apply(client, arguments); };
        },
        clientGetter = function(member) { return function() { return client[member]; };},
        clientSetter = function(member) { return function(val) { client[member] = val; };},
        reconnect = function() {
            var oldclient = client;
            if (oldclient) { oldclient.destroy(); }
            client = http.createClient.apply(http, clientArgs);
            client._events = util.extend(events, client._events); // EventEmitter._events stores event handlers
            client.emit('reconnect', oldclient);
        };
    
    // Create initial http.Client
    reconnect();
    client.on('error', function(err) { reconnect(); });

    // Wrap client so implementation can be swapped out when there are connection errors
    for (var j in client) {
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

/** Accepts an EventEmitter object that emits text data. LineReader buffers the text and emits a 'data'
event each time a newline is encountered. For example, */
util.LineReader = function(eventEmitter, event) {  
  EventEmitter.call(this);
  event = event || 'data';
  
  var self = this, buffer = '';

  var emitLine = function(buffer) {
    var lineEnd = buffer.indexOf("\n");
    var line = (lineEnd === -1) ? buffer : buffer.substring(0, lineEnd);
    if (line) { self.emit('data', line); }
    return buffer.substring(line.length + 1, buffer.length);
  };
  
  var readloop = function(data) { 
    if (data) { buffer += data.toString(); }
    if (buffer.indexOf("\n") > -1) {     
      buffer = emitLine(buffer);
      process.nextTick(readloop.bind(this));
    }
  };
  
  eventEmitter.on(event, readloop.bind(this));
}
util.inherits(util.LineReader, EventEmitter);

util.extend(exports, util);
