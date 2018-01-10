import * as crc from 'crc';
import { ServerInfo } from 'pinus';

export function dispatch(uid: string , connectors: ServerInfo[]) {
    let index = Math.abs(crc.crc32(uid)) % connectors.length;
    return connectors[index];
}