
export interface ISocket {
    once(evt: 'disconnect', listener: () => void): void;
    once(evt: 'error', listener: () => void): void;
    on(evt: 'disconnect', listener: (reason: string) => void): void;
    on(evt: 'error', listener: (reason: string) => void): void;
    on(evt: 'message', listener: (msg: any) => void): void;
    send(msg: any): void;
    sendRaw(msg: any): void;
    disconnect(): void;
    sendBatch(msgs: any[]): void;

    emit(evt: 'heartbeat'): void;
    emit(evt: 'message' , pkg: any): void;
    emit(evt: 'closing' , reason: string): void;
    emit(evt: 'handshake' , pkg: any): void;

    state: number;

    id ?: number;

    handshakeResponse ?: (response: any) => void;
    sendForce ?: (response: any) => void;

    remoteAddress ?: {ip: string , port ?: number};
}