/**
 * Loader Module
 */

import * as fs from 'fs';
import * as path from 'path';
import { getFromContainer, removeFromContainer, isUseContainer } from './container';
import { LoaderPathType, isDefined } from './decoraters';

/**
 * Load modules under the path.
 * If the module is a function, loader would treat it as a factory function
 * and invoke it with the context parameter to get a instance of the module.
 * Else loader would just require the module.
 * Module instance can specify a name property and it would use file name as
 * the default name if there is no name property. All loaded modules under the
 * path would be add to an empty root object with the name as the key.
 *
 * @param  {String} mpath    the path of modules. Load all the files under the
 *                           path, but *not* recursively if the path contain
 *                           any sub-directory.
 * @param  {Object} context  the context parameter that would be pass to the
 *                           module factory function.
 * @return {Object}          module that has loaded.
 */
export function load(mpath: string, context: any, reload: boolean, createInstance: boolean, pathType: LoaderPathType) {
    if (!mpath) {
        throw new Error('opts or opts.path should not be empty.');
    }

    try {
        mpath = fs.realpathSync(mpath);
    } catch (err) {
        throw err;
    }

    if (!isDir(mpath)) {
        throw new Error('path should be directory.');
    }

    return loadPath(mpath, context, reload, createInstance, pathType);
}

export function loadFile(fp: string, reload: boolean) {
    let m  = reload ? requireUncached(fp) : require(fp);
    return m;
}

export function loadPath(path: string, context: any, reload: boolean, createInstance: boolean, pathType: LoaderPathType) {
    let files = fs.readdirSync(path);
    if (files.length === 0) {
        console.warn('path is empty, path:' + path);
        return;
    }

    if (path.charAt(path.length - 1) !== '/') {
        path += '/';
    }

    let fp, fn, m, res: {[key: string]: any} = {};
    for (let i = 0, l = files.length; i < l; i++) {
        fn = files[i];
        fp = path + fn;

        if (!isFile(fp) || !checkFileType(fn, '.js')) {
            // only load js file type
            continue;
        }

        m = loadFile(fp, reload);

        if (!m) {
            continue;
        }
        // 兼容旧的写法
        if (typeof m.default === 'function') {
             let instance = m.default(context);
             let name = instance.name || getFileName(fn, '.js'.length);
             res[name] = instance;
        }

        for (let key in m) {
            let cls = m[key];
            if (isDefined(cls, pathType)) {
                if (createInstance) {
                    res[cls.name] = getFromContainer(cls);
                } else {
                    res[cls.name] = cls;
                }
            }
        }
    }

    return res;
}

/**
 * Check file suffix

 * @param fn {String} file name
 * @param suffix {String} suffix string, such as .js, etc.
 */
export function checkFileType(fn: string, suffix: string) {
    if (suffix.charAt(0) !== '.') {
        suffix = '.' + suffix;
    }

    if (fn.length <= suffix.length) {
        return false;
    }

    let str = fn.substring(fn.length - suffix.length).toLowerCase();
    suffix = suffix.toLowerCase();
    return str === suffix;
}

let isFile = function (path: string) {
    return fs.statSync(path).isFile();
};

let isDir = function (path: string) {
    return fs.statSync(path).isDirectory();
};

let getFileName = function (fp: string, suffixLength: number) {
    let fn = path.basename(fp);
    if (fn.length > suffixLength) {
        return fn.substring(0, fn.length - suffixLength);
    }

    return fn;
};

let requireUncached = function (module: string) {
    if (isUseContainer()) {
        let m = require.cache[require.resolve(module)];
        if (m) {
            if (typeof m.default === 'function') {
                removeFromContainer(m.default);
            }
        }
    }
    delete require.cache[require.resolve(module)];
    return require(module);
};