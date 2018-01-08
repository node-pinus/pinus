(function(window) {
	var cloneError = function(origin) {
		// copy the stack infos for Error instance json result is empty
		if (!(origin instanceof Error)) {
			return origin;
		}
		var res = {
			message: origin.message,
			stack: origin.stack
		};
		return res;
	};

	var protocol = function() {
		this.PRO_OK = 1;
		this.PRO_FAIL = -1;
	}

	protocol.prototype = {
		composeRequest: function(id, moduleId, body) {
			if (id) {
				// request message
				return JSON.stringify({
					reqId: id,
					moduleId: moduleId,
					body: body
				});
			} else {
				// notify message
				return {
					moduleId: moduleId,
					body: body
				};
			}
		},

		composeResponse: function(req, err, res) {
			if (req.reqId) {
				// request only
				return JSON.stringify({
					respId: req.reqId,
					error: cloneError(err),
					body: res
				});
			}
			// invalid message(notify dose not need response)
			return null;
		},

		composeCommand: function(id, command, moduleId, body) {
			if (id) {
				// command message
				return JSON.stringify({
					reqId: id,
					command: command,
					moduleId: moduleId,
					body: body
				});
			} else {
				return JSON.stringify({
					command: command,
					moduleId: moduleId,
					body: body
				});
			}
		},

		parse: function(msg) {
			if (typeof msg === 'string') {
				return JSON.parse(msg);
			}
			return msg;
		},

		isRequest: function(msg) {
			return (msg && msg.reqId);
		}
	}

	protocol.PRO_OK = 1;
	protocol.PRO_FAIL = -1;

	window.protocol = new protocol();
})(window);