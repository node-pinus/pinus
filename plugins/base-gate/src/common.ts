
import { createHash } from 'crypto';

export interface ConnectorHost {
    code: number;
    openid?: string;
    host?: string;
    port?: number;
    hash?: string;
}

export enum Code {
    OK = 0,
    FAIL  = 1,
    FA_NO_SERVER_AVAILABLE = 2,
}

export namespace common {
    let MD5_PASSWORD = 'gregkhwjekghwesdvfklhwfl;kqwjfqelwfj';

    // 计算json+md5的md5码，并返回
    export function calcServerHash(json: string) {
        return createHash('md5').update(json + MD5_PASSWORD).digest('hex');
    }
    // 计算ConnectorHost的hash值
    export function calcConnectorHostHash(msg: ConnectorHost) {
        return common.calcServerHash(msg.openid + msg.host + String(msg.port));
    }
}
