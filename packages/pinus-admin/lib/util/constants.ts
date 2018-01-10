export let DEFAULT_PARAM = {
    KEEPALIVE: 60 * 1000,
    TIMEOUT: 5 * 1000,
    RECONNECT_DELAY: 1 * 1000,
    RECONNECT_DELAY_MAX: 60 * 1000
};
export let TYPE_CLIENT = 'client';
export let TYPE_MONITOR = 'monitor';


/**
 * ServerInfo
 */
export interface ServerInfo {
    id: string;
    serverType: string;
    host: string;
    port: number;
    clientHost: string;
    clientPort: number;
    frontend ?: boolean;

    pid ?: string;
}


export interface AdminUserInfo {
    id: string;
    level: number;
    username: string;
    password: string;
}

export interface AdminServerInfo {
    type: string;
    token: string;
}


export type Callback = (err?: Error | string, body?: any) => void;