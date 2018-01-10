
/**
* 存储虚接口
*/
export interface IStore {
    add(key: string, value: string, done: (err?: Error) => void): void;
    remove(key: string, value: string, done: (err?: Error) => void): void;
    load(key: string, done: (err?: Error , list ?: Array<string>) => void): void;
    removeAll(key: string, done: (err?: Error) => void): void;
}