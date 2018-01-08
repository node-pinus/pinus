exports.composeRequest = function(id, moduleId, body) {
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
};

exports.composeResponse = function(req, err, res) {
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
};

exports.composeCommand = function(id, command, moduleId, body) {
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
}

exports.parse = function(msg) {
    if (typeof msg === 'string') {
        return JSON.parse(msg);
    }
    return msg;
};

exports.isRequest = function(msg) {
    return (msg && msg.reqId);
};

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

exports.PRO_OK = 1;
exports.PRO_FAIL = -1;