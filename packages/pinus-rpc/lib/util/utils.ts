
export function invokeCallback(cb: Function, err: Error) {
    if (typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
}

export function applyCallback(cb: Function, args: any[]) {
    if (typeof cb === 'function') {
        cb.apply(null, args);
    }
}

export function getObjectClass(obj: Object) {
    if (!obj) {
        return;
    }

    let constructor = obj.constructor;
    if (!constructor) {
        return;
    }

    if (constructor.name) {
        return constructor.name;
    }

    let str = constructor.toString();
    if (!str) {
        return;
    }

    let arr = null;
    if (str.charAt(0) === '[') {
        arr = str.match(/\[\w+\s*(\w+)\]/);
    } else {
        arr = str.match(/function\s*(\w+)/);
    }

    if (arr && arr.length === 2) {
        return arr[1];
    }
}

/**
 * Utils check float
 *
 * @param  {Float}   float
 * @return {Boolean} true|false
 * @api public
 */
export function checkFloat(v: any) {
    return v === Number(v) && v % 1 !== 0;
    // return parseInt(v) !== v;
}

/**
 * Utils check type
 *
 * @param  {String}   type
 * @return {Function} high order function
 * @api public
 */
export function isType(type: any) {
    return function (obj: any) {
        return {}.toString.call(obj) === '[object ' + type + ']';
    };
}

/**
 * Utils check array
 *
 * @param  {Array}   array
 * @return {Boolean} true|false
 * @api public
 */
export let checkArray = Array.isArray || isType('Array');

/**
 * Utils check number
 *
 * @param  {Number}  number
 * @return {Boolean} true|false
 * @api public
 */
export let checkNumber = isType('Number');

/**
 * Utils check function
 *
 * @param  {Function}   func function
 * @return {Boolean}    true|false
 * @api public
 */
export let checkFunction = isType('Function');
/**
 * Utils check object
 *
 * @param  {Object}   obj object
 * @return {Boolean}  true|false
 * @api public
 */
export let checkObject = isType('Object');

/**
 * Utils check string
 *
 * @param  {String}   string
 * @return {Boolean}  true|false
 * @api public
 */
export let checkString = isType('String');

/**
 * Utils check boolean
 *
 * @param  {Object}   obj object
 * @return {Boolean}  true|false
 * @api public
 */
export let checkBoolean = isType('Boolean');

/**
 * Utils check bean
 *
 * @param  {Object}   obj object
 * @return {Boolean}  true|false
 * @api public
 */
export let checkBean = function (obj: any) {
    return obj && obj['$id'] &&
        checkFunction(obj['writeFields']) &&
        checkFunction(obj['readFields']);
};

export let checkNull = function (obj: any) {
    return !isNotNull(obj);
};

/**
 * Utils args to array
 *
 * @param  {Object}  args arguments
 * @return {Array}   array
 * @api public
 */
export let to_array = function (args: any[]) {
    let len = args.length;
    let arr = new Array(len);

    for (let i = 0; i < len; i++) {
        arr[i] = args[i];
    }

    return arr;
};

/**
 * Utils check is not null
 *
 * @param  {Object}   value
 * @return {Boolean}  true|false
 * @api public
 */
export let isNotNull = function (value: any) {
    if (value !== null && typeof value !== 'undefined')
        return true;
    return false;
};

export let getType = function (object: any) {
    if (object == null || typeof object === 'undefined') {
        return typeMap['null'];
    }

    if (Buffer.isBuffer(object)) {
        return typeMap['buffer'];
    }

    if (checkArray(object)) {
        return typeMap['array'];
    }

    if (checkString(object)) {
        return typeMap['string'];
    }

    if (checkObject(object)) {
        if (checkBean(object)) {
            return typeMap['bean'];
        }

        return typeMap['object'];
    }

    if (checkBoolean(object)) {
        return typeMap['boolean'];
    }

    if (checkNumber(object)) {
        if (checkFloat(object)) {
            return typeMap['float'];
        }

        if (isNaN(object)) {
            return typeMap['null'];
        }

        return typeMap['number'];
    }
};

export let typeArray = ['', 'null', 'buffer', 'array', 'string', 'object', 'bean', 'boolean', 'float', 'number'];
export let typeMap: any = {};
for (let i = 1; i <= typeArray.length; i++) {
    typeMap[typeArray[i]] = i;
}

export let getBearcat = function () {
    return require('bearcat');
};

/**
 * 列出ES6的一个Class实例上的所有方法，但不包括父类的
 * @param objInstance
 */
export function listEs6ClassMethods(objInstance: { [key: string]: any }) {
    if (objInstance.prototype && objInstance.prototype.constructor === objInstance) {
        let names: string[] = [];
        let methodNames = Object.getOwnPropertyNames(objInstance.prototype);
        for (let name of methodNames) {
            let method = objInstance.prototype[name];
            // Supposedly you'd like to skip constructor
            if (!(method instanceof Function) || name === 'constructor') continue;
            names.push(name);
        }
        return names;
    } else {
        let names: string[] = [];
        let methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(objInstance)).concat(Object.getOwnPropertyNames(objInstance));
        for (let name of methodNames) {
            let method = objInstance[name];
            // Supposedly you'd like to skip constructor
            if (!(method instanceof Function) || name === 'constructor') continue;
            names.push(name);
        }
        return names;
    }
}