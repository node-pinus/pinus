export function composeRequest(id: number, moduleId: string, body: any) {
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
}

export function composeResponse (req: {reqId: number}, err: string | Error, res: any) {
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
}

export function composeCommand(id: number, command: string, moduleId: string, body: any) {
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

export function parse(msg: any) {
    if (typeof msg === 'string') {
        return JSON.parse(msg);
    }
    return msg;
}

export function isRequest(msg: any) {
    return (msg && msg.reqId);
}

let cloneError = function (origin: any) {
    // copy the stack infos for Error instance json result is empty
    if (!(origin instanceof Error)) {
        return origin;
    }
    let res = {
        message: origin.message,
        stack: origin.stack
    };
    return res;
};

export enum PRO_CODE {
    OK = 1,
    FAIL = -1,
}

export let PRO_OK = PRO_CODE.OK;
export let PRO_FAIL = PRO_CODE.FAIL;