import * as fs from 'fs';
import * as path from 'path';
import * as Constants from './constants';
import { RemoteServerCode } from '../index';
import { DIR } from './constants';

/**
 * Get system remote service path
 *
 * @param  {String} role server role: frontend, backend
 * @return {String}      path string if the path exist else null
 */
export function getSysRemotePath(role: string) {
    let p = path.join(__dirname, '/../common/remote/', role);
    return fs.existsSync(p) ? p : null;
}

/**
 * Get user remote service path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
export function getUserRemotePath(appBase: string, serverType: string) {
    let p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.REMOTE);
    return fs.existsSync(p) ? p : null;
}

/**
 * Get user remote cron path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
export function getCronPath(appBase: string, serverType: string) {
    let p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.CRON);
    return fs.existsSync(p) ? p : null;
}

/**
 * List all the subdirectory names of user remote directory
 * which hold the codes for all the server types.
 *
 * @param  {String} appBase application base path
 * @return {Array}         all the subdiretory name under servers/
 */
export function listUserRemoteDir(appBase: string) {
    let base = path.join(appBase, '/app/servers/');
    let files = fs.readdirSync(base);
    return files.filter(function (fn) {
        if (fn.charAt(0) === '.') {
            return false;
        }

        return fs.statSync(path.join(base, fn)).isDirectory();
    });
}

/**
 * Compose remote path record
 *
 * @param  {String} namespace  remote path namespace, such as: 'sys', 'user'
 * @param  {String} serverType
 * @param  {String} path       remote service source path
 * @return {Object}            remote path record
 */
export function remotePathRecord(namespace: string, serverType: string, path: string): RemoteServerCode {
    return { namespace: namespace, serverType: serverType, path: path };
}

/**
 * Get handler path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
export function getHandlerPath(appBase: string, serverType: string) {
    let p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.HANDLER);
    return fs.existsSync(p) ? p : null;
}

/**
 * Get admin script root path.
 *
 * @param  {String} appBase application base path
 * @return {String}         script path string
 */
export function getScriptPath(appBase: string) {
    return path.join(appBase, Constants.DIR.SCRIPT);
}

/**
 * Get logs path.
 *
 * @param  {String} appBase application base path
 * @return {String}         logs path string
 */
export function getLogPath(appBase: string) {
    return path.join(appBase, Constants.DIR.LOG);
}

export function getPluginRemotePath(basePath: string) {
    let p = path.join(basePath, DIR.REMOTE);
    return fs.existsSync(p) ? p : null;
}

export function getPluginHandlerPath(basePath: string) {
    let p = path.join(basePath, DIR.HANDLER);
    return fs.existsSync(p) ? p : null;
}

export function getPluginCronPath(basePath: string) {
    let p = path.join(basePath, DIR.CRON);
    return fs.existsSync(p) ? p : null;
}