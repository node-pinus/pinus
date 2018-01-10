export interface IHybridSocket {

    once(evt: 'close', listener: () => void): void;
    on(evt: 'error', listener: () => void): void;
    on(evt: 'message', listener: (msg: any) => void): void;
    emit(evt: 'close'): void;
    close(): void;
    send(msg: any, options?: { binary?: boolean }, listener?: (err?: Error) => void): void;
}