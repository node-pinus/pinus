var EventEmitter = require('events').EventEmitter;
var Util = require('util');
var net = require('net');
var MqttCon = require('mqtt-connection');

var constants = {
    DEFAULT_PARAM: {
        KEEPALIVE: 60 * 1000,
        TIMEOUT: 5 * 1000,
        RECONNECT_DELAY: 1 * 1000,
        RECONNECT_DELAY_MAX: 60 * 1000
    },
    TYPE_CLIENT: 'client',
    TYPE_MONITOR: 'monitor'
};

var MqttClient = function(opts) {
    EventEmitter.call(this);
    this.clientId = 'MQTT_ADMIN_' + Date.now();
    this.id = opts.id;
    this.requests = {};
    this.connectedTimes = 1;
    this.host = null;
    this.port = null;
    this.socket = null;
    this.lastPing = -1;
    this.lastPong = -1;
    this.closed = false;
    this.timeoutId = null;
    this.connected = false;
    this.reconnectId = null;
    this.timeoutFlag = false;
    this.keepaliveTimer = null;
    this.reconnectDelay = 0;
    this.reconnectDelayMax = opts.reconnectDelayMax || constants.DEFAULT_PARAM.RECONNECT_DELAY_MAX;
    this.timeout = opts.timeout || constants.DEFAULT_PARAM.TIMEOUT;
    this.keepalive = opts.keepalive || constants.DEFAULT_PARAM.KEEPALIVE;
}

Util.inherits(MqttClient, EventEmitter);

MqttClient.prototype.connect = function(host, port, cb) {
    cb = cb || function() {}
    if (this.connected) {
        return cb(new Error('MqttClient has already connected.'));
    }

    if (host) {
        this.host = host;
    } else {
        host = this.host;
    }

    if (port) {
        this.port = port;
    } else {
        port = this.port;
    }

    var self = this;
    this.closed = false;

    var stream = net.createConnection(this.port, this.host);
    this.socket = MqttCon(stream);

    // console.info('try to connect %s %s', this.host, this.port);
    this.socket.connect({
        clientId: this.clientId
    });


    this.addTimeout();

    this.socket.on('connack', function() {
        if (self.connected) {
            return;
        }

        self.connected = true;

        self.setupKeepAlive();

        if (self.connectedTimes++ == 1) {
            self.emit('connect');
            cb();
        } else {
            self.emit('reconnect');
        }
    });

    this.socket.on('publish', function(pkg) {
        var topic = pkg.topic;
        var msg = pkg.payload.toString();
        msg = JSON.parse(msg);

        // console.debug('[MqttClient] publish %s %j', topic, msg);
        self.emit(topic, msg);
    });

    this.socket.on('close', function() {
        console.error('mqtt socket is close, remote server host: %s, port: %s', host, port);
        self.onSocketClose();
    });

    this.socket.on('error', function(err) {
        console.error('mqtt socket is error, remote server host: %s, port: %s', host, port);
        // self.emit('error', new Error('[MqttClient] socket is error, remote server ' + host + ':' + port));
        self.onSocketClose();
    });

    this.socket.on('pingresp', function() {
        self.lastPong = Date.now();
    });

    this.socket.on('disconnect', function() {
        console.error('mqtt socket is disconnect, remote server host: %s, port: %s', host, port);
        self.emit('disconnect', self.id);
        self.onSocketClose();
    });

    this.socket.on('timeout', function(reconnectFlag) {
        if (reconnectFlag) {
            self.reconnect();
        } else {
            self.exit();
        }
    })
}

MqttClient.prototype.send = function(topic, msg) {
    if (this.closed ||  !this.socket) {
        return;
    }
    this.socket.publish({
        topic: topic,
        payload: JSON.stringify(msg)
    })
}

MqttClient.prototype.onSocketClose = function() {
    // console.log('onSocketClose ' + this.closed);
    if (this.closed) {
        return;
    }

    clearInterval(this.keepaliveTimer);
    clearTimeout(this.timeoutId);
    this.keepaliveTimer = null;
    this.lastPing = -1;
    this.lastPong = -1;
    this.connected = false;
    this.closed = true;
    delete this.socket;
    this.socket = null;

    if (this.connectedTimes > 1) {
        this.reconnect();
    } else {
        this.exit();
    }
}

MqttClient.prototype.addTimeout = function(reconnectFlag) {
    var self = this;
    if (this.timeoutFlag) {
        return;
    }

    this.timeoutFlag = true;

    this.timeoutId = setTimeout(function() {
        self.timeoutFlag = false;
        console.error('mqtt client connect %s:%d timeout %d s', self.host, self.port, self.timeout / 1000);
        self.socket.emit('timeout', reconnectFlag);
    }, self.timeout);
}

MqttClient.prototype.reconnect = function() {
    var delay = this.reconnectDelay * 2 || constants.DEFAULT_PARAM.RECONNECT_DELAY;
    if (delay > this.reconnectDelayMax) {
        delay = this.reconnectDelayMax;
    }

    this.reconnectDelay = delay;

    var self = this;

    // console.debug('[MqttClient] reconnect %d ...', delay);
    this.reconnectId = setTimeout(function() {
        console.info('reconnect delay %d s', delay / 1000);
        self.addTimeout(true);
        self.connect();
    }, delay);
}

MqttClient.prototype.setupKeepAlive = function() {
    clearTimeout(this.reconnectId);
    clearTimeout(this.timeoutId);

    var self = this;
    this.keepaliveTimer = setInterval(function() {
        self.checkKeepAlive(self);
    }, this.keepalive);
}

MqttClient.prototype.checkKeepAlive = function(self) {
    if (self.closed || !self.socket) {
        return;
    }


    var now = Date.now();
    var KEEP_ALIVE_TIMEOUT = self.keepalive * 2;
    if (self.lastPing > 0) {
        if (self.lastPong < self.lastPing) {
            if (now - self.lastPing > KEEP_ALIVE_TIMEOUT) {
                console.error('mqtt rpc client checkKeepAlive error timeout for %d', KEEP_ALIVE_TIMEOUT);
                self.close();
            }
        } else {
            self.socket.pingreq();
            self.lastPing = Date.now();
        }
    } else {
        self.socket.pingreq();
        self.lastPing = Date.now();
    }
}

MqttClient.prototype.disconnect = function() {
    this.close();
}

MqttClient.prototype.close = function() {
    this.connected = false;
    this.closed = true;
    this.socket.disconnect();
}

MqttClient.prototype.exit = function() {
    console.info('exit ...');
    //process.exit(0);
}

module.exports = MqttClient;