import * as reflect from 'reflect-metadata';
export enum LoaderPathType {
    PINUS_REMOTER = 'pinus:remoter',
    PINUS_HANDLER = 'pinus:hanlder',
    PINUS_CRONNER = 'pinus:cronner'
}

const DUPLICATED_REMOTER_DECORATOR = 'Cannot apply @remoter decorator multiple times.';
const DUPLICATED_HANDLER_DECORATOR = 'Cannot apply @handler decorator multiple times.';
const DUPLICATED_CRONNER_DECORATOR = 'Cannot apply @cronner decorator multiple times.';

// used to access design time types
export const DESIGN_PARAM_TYPES = 'design:paramtypes';

export function remoter() {
    return function (target: any) {

        if (Reflect.hasOwnMetadata(LoaderPathType.PINUS_REMOTER, target)) {
            throw new Error(DUPLICATED_REMOTER_DECORATOR);
        }

        const types = Reflect.getMetadata(DESIGN_PARAM_TYPES, target) || [];
        Reflect.defineMetadata(LoaderPathType.PINUS_REMOTER, types, target);

        return target;
    };
}
export function handler() {
    return function (target: any) {

        if (Reflect.hasOwnMetadata(LoaderPathType.PINUS_HANDLER, target)) {
            throw new Error(DUPLICATED_HANDLER_DECORATOR);
        }

        const types = Reflect.getMetadata(DESIGN_PARAM_TYPES, target) || [];
        Reflect.defineMetadata(LoaderPathType.PINUS_HANDLER, types, target);

        return target;
    };
}
export function cronner() {
    return function (target: any) {

        if (Reflect.hasOwnMetadata(LoaderPathType.PINUS_CRONNER, target)) {
            throw new Error(DUPLICATED_CRONNER_DECORATOR);
        }

        const types = Reflect.getMetadata(DESIGN_PARAM_TYPES, target) || [];
        Reflect.defineMetadata(LoaderPathType.PINUS_CRONNER, types, target);

        return target;
    };
}

export function notImplement() {
    throw new Error('not implement');
}

export function method() {
    return function (target: any, targetKey: string, index?: number): any {
        return {
            configurable: true,
            enumerable: true,
            value: notImplement,
            writable: true
        };
    };
}

export function isRemoter(ctor: Function) {
    return Reflect.hasMetadata(LoaderPathType.PINUS_REMOTER, ctor);
}

export function isHandler(ctor: Function) {
    return Reflect.hasMetadata(LoaderPathType.PINUS_HANDLER, ctor);
}

export function isCronner(ctor: Function) {
    return Reflect.hasMetadata(LoaderPathType.PINUS_CRONNER, ctor);
}

export function isDefined(ctor: Function, pathType: LoaderPathType) {
    return Reflect.hasMetadata(pathType, ctor);
}