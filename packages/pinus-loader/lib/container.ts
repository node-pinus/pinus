/**
 * Container options.
 */
export interface UseContainerOptions {

    /**
     * If set to true, then default container will be used in the case if given container haven't returned anything.
     */
    fallback?: boolean;

    /**
     * If set to true, then default container will be used in the case if given container thrown an exception.
     */
    fallbackOnErrors?: boolean;

}

export type ClsType<T> = { new (...args: any[]): T }|Function;

/**
 * Container to be used by this library for inversion control. If container was not implicitly set then by default
 * container simply creates a new instance of the given class.
 */
export const defaultContainer: { get<T>(someClass: ClsType<T>): T , unbind<T>(someClass: ClsType<T>): void} = new (class {
    private instances: { type: Function, object: any }[] = [];

    get<T>(someClass: { new (...args: any[]): T }): T {
        let instance = this.instances.find(instance => instance.type === someClass);
        if (!instance) {
            instance = { type: someClass, object: new someClass() };
            this.instances.push(instance);
        }

        return instance.object;
    }
    unbind<T>(someClass: ClsType<any>) {
        let idx = this.instances.findIndex(instance => instance.type === someClass);
        if (idx >= 0) {
            this.instances.splice(idx, 1);
        }
    }
})();

let userContainer: { get<T>(someClass: ClsType<T>): T, unbind<T>(someClass: ClsType<T>): void };
let userContainerOptions: UseContainerOptions|undefined;

/**
 * Sets container to be used by this library.
 */
export function useContainer(iocContainer: { get(someClass: ClsType<any>): any , unbind(someClass: ClsType<any>): void}, options?: UseContainerOptions) {
    userContainer = iocContainer;
    userContainerOptions = options;
}

export function isUseContainer() {
    return userContainer !== undefined;
}

/**
 * Gets the IOC container used by this library.
 */
export function getFromContainer<T>(someClass: ClsType<T>): T {
    if (userContainer) {
        try {
            const instance = userContainer.get(someClass);
            if (instance)
                return instance;

            if (!userContainerOptions || !userContainerOptions.fallback)
                return instance;

        } catch (error) {
            if (!userContainerOptions || !userContainerOptions.fallbackOnErrors)
                throw error;
        }
    }
    return defaultContainer.get<T>(someClass);
}

/**
 * Remove object from the IOC container used by this library.
 */
export function removeFromContainer<T>(someClass: ClsType<T>) {
    if (userContainer) {
        try {
            userContainer.unbind(someClass);
        } catch (error) {
            if (!userContainerOptions || !userContainerOptions.fallbackOnErrors)
                throw error;
        }
    }
    defaultContainer.unbind<T>(someClass);
}