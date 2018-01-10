/**
 * master server info
 */
export interface MasterInfo {
    id: string;
    host: string;
    port: number;
}

/**
 * Represents some Type of the Object.
 */
export type ObjectType<T> = {
    new (): T;
};
