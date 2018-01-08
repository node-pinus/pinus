(function(window) {

	var Client = function(opt) {
	this.id = "";
	this.reqId = 1;
	this.callbacks = {};
	this.listeners = {};
	this.state = Client.ST_INITED;
	this.socket = null;
	opt = opt || {};
	this.username = opt['username'] || "";
	this.password = opt['password'] || "";
	this.md5 = opt['md5'] || false;
};

	Client.prototype = {
		connect: function(id, host, port, cb) {
			this.id = id;

                var self = this;
                console.log('try to connect ' + host + ':' + port);
            this.socket = new mqttClient({
                id: id
            });
            // this.socket = mqtt.connect('ws://'+host+':'+port, {clientId:id}); // you add a ws:// url here
            this.socket.connect(host, port, mqtt);

                this.socket.on('connect', function () {
                    self.state = Client.ST_CONNECTED;
                    self.doSend('register', {
                        type: "client",
                        id: id,
                        username: self.username,
                        password: self.password,
                        md5: self.md5
                    });
                });

                this.socket.on('register', function (res) {
                    if (res.code !== protocol.PRO_OK) {
                        cb(res.msg);
                        return;
                    }

                    self.state = Client.ST_REGISTERED;
                    cb();
                });

                this.socket.on('client', function (msg) {
                    msg = protocol.parse(msg);
                    if (msg.respId) {
                        // response for request
                        var cb = self.callbacks[msg.respId];
                        delete self.callbacks[msg.respId];
                        if (cb && typeof cb === 'function') {
                            cb(msg.error, msg.body);
                        }
                    } else if (msg.moduleId) {
                        // notify
                        self.emit(msg.moduleId, msg);
                    }
                });

                this.socket.on('error', function (err) {
                    if (self.state < Client.ST_CONNECTED) {
                        cb(err);
                    }

                    self.emit('error', err);
                });

                this.socket.on('disconnect', function (reason) {
                    this.state = Client.ST_CLOSED;
                    self.emit('close');
                });


		},

		request: function(moduleId, msg, cb) {
			var id = this.reqId++;
			// something dirty: attach current client id into msg
			msg = msg || {};
			msg.clientId = this.id;
			msg.username = this.username;
			console.trace("request:" , JSON.stringify(msg));
			var req = protocol.composeRequest(id, moduleId, msg);
			this.callbacks[id] = cb;
			this.doSend('client', req);
		},

		notify: function(moduleId, msg) {
			// something dirty: attach current client id into msg
			msg = msg || {};
			msg.clientId = this.id;
			msg.username = this.username;
			var req = protocol.composeRequest(null, moduleId, msg);
			this.doSend('client', req);
			// this.socket.emit('client', req);
		},

		command: function(command, moduleId, msg, cb) {
			var id = this.reqId++;
			msg = msg || {};
			msg.clientId = this.id;
			msg.username = this.username;
			var commandReq = protocol.composeCommand(id, command, moduleId, msg);
			this.callbacks[id] = cb;
			this.doSend('client', commandReq);
		},

		on: function(event, listener) {
			this.listeners[event] = this.listeners[event] || [];
			this.listeners[event].push(listener);
		},

		emit: function(event) {
			var listeners = this.listeners[event];
			if (!listeners || !listeners.length) {
				return;
			}

			var args = Array.prototype.slice.call(arguments, 1);
			var listener;
			for (var i = 0, l = listeners.length; i < l; i++) {
				listener = listeners[i];
				if (typeof listener === 'function') {
					listener.apply(null, args);
				}
			}
		},

		doSend: function(topic, msg) {
            this.socket.send(topic, msg);
		}
	};

Client.ST_INITED = 1;
Client.ST_CONNECTED = 2;
Client.ST_REGISTERED = 3;
Client.ST_CLOSED = 4;

	window.ConsoleClient = Client;
})(window);