
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as cliff from 'cliff'
import * as mkdirp from 'mkdirp'
import { FILEREAD_ERROR, CONNECT_ERROR, MASTER_HA_NOT_FOUND, CLOSEAPP_INFO, KILL_CMD_WIN, KILL_CMD_LUX } from './constants';
import * as utils from '../../lib/util/utils'
import * as starter from '../../lib/master/starter'
import * as constants from '../../lib/util/constants'
import { AdminClient } from 'pinus-admin'
import { exec } from 'child_process';
import { ConsoleModule as co } from '../../lib/modules/console'

export let version = require('../../../package.json').version
/**
 * Get user's choice on connector selecting
 * 
 * @param {Function} cb
 */
export function connectorType(cb : Function)
{
    prompt('Please select underly connector, 1 for websocket(native socket), 2 for socket.io, 3 for wss, 4 for socket.io(wss), 5 for udp, 6 for mqtt: [1]', function (msg :string)
    {
        switch (msg.trim())
        {
            case '':
                cb(1);
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                cb(msg.trim());
                break;
            default:
                console.log(('Invalid choice! Please input 1 - 5.' as any).red + '\n');
                connectorType(cb);
                break;
        }
    });
}


export function connectToMaster(id : string, opts : any, cb : (client : AdminClient)=>void)
{
    let client = new AdminClient({ username: opts.username, password: opts.password, md5: true });
    client.connect(id, opts.host, opts.port, function (err)
    {
        if (err)
        {
            abort(CONNECT_ERROR + err.red);
        }
        if (typeof cb === 'function')
        {
            cb(client);
        }
    });
}

/**
 * Prompt confirmation with the given `msg`.
 *
 * @param {String} msg
 * @param {Function} fn
 */
export function confirm(msg : string, fn : Function)
{
    prompt(msg, function (val : string)
    {
        fn(/^ *y(es)?/i.test(val));
    });
}

/**
 * Prompt input with the given `msg` and callback `fn`.
 *
 * @param {String} msg
 * @param {Function} fn
 */
export function prompt(msg : string, fn :Function)
{
    if (' ' === msg[msg.length - 1])
    {
        process.stdout.write(msg);
    } else
    {
        console.log(msg);
    }
    process.stdin.setEncoding('ascii');
    process.stdin.once('data', function (data)
    {
        fn(data);
    }).resume();
}

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
export function abort(str : string)
{
    console.error(str);
    process.exit(1);
}

/**
 * Copy template files to project.
 *
 * @param {String} origin
 * @param {String} target
 */
export function copy(origin : string, target : string)
{
    if (!fs.existsSync(origin))
    {
        abort(origin + 'does not exist.');
    }
    if (!fs.existsSync(target))
    {
        mkdir(target);
        console.log(('   create : ' as any).green + target);
    }
    fs.readdir(origin, function (err, datalist)
    {
        if (err)
        {
            abort(FILEREAD_ERROR);
        }
        for (let i = 0; i < datalist.length; i++)
        {
            let oCurrent = path.resolve(origin, datalist[i]);
            let tCurrent = path.resolve(target, datalist[i]);
            if (fs.statSync(oCurrent).isFile())
            {
                fs.writeFileSync(tCurrent, fs.readFileSync(oCurrent, ''), '');
                console.log(('   create : ' as any).green + tCurrent);
            } else if (fs.statSync(oCurrent).isDirectory())
            {
                copy(oCurrent, tCurrent);
            }
        }
    });
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */
export function mkdir(path : string, fn?: Function)
{
    mkdirp(path, 0o755, function (err)
    {
        if (err)
        {
            throw err;
        }
        console.log(('   create : ' as any).green + path);
        if (typeof fn === 'function')
        {
            fn();
        }
    });
}

/**
 * Run server.
 * 
 * @param {Object} server server information
 */
export function runServer(server : any)
{
    let cmd, key;
    let main = path.resolve(server.home, 'app.js');
    if (utils.isLocal(server.host))
    {
        let options = [];
        options.push(main);
        for (key in server)
        {
            options.push(util.format('%s=%s', key, server[key]));
        }
        starter.localrun(process.execPath, null, options);
    } else
    {
        cmd = util.format('cd "%s" && "%s"', server.home, process.execPath);
        cmd += util.format(' "%s" ', main);
        for (key in server)
        {
            cmd += util.format(' %s=%s ', key, server[key]);
        }
        starter.sshrun(cmd, server.host);
    }
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */
export function emptyDirectory(path : string, fn :Function)
{
    fs.readdir(path, function (err, files)
    {
        if (err && 'ENOENT' !== err.code)
        {
            abort(FILEREAD_ERROR);
        }
        fn(!files || !files.length);
    });
}

/**
 * Terminal application.
 *
 * @param {String} signal stop/kill
 * @param {Object} opts options for `stop/kill` operation
 */
export function terminal(signal : string, opts : any)
{
    console.info(CLOSEAPP_INFO);
    // option force just for `kill`
    if (opts.force)
    {
        if (os.platform() === constants.PLATFORM.WIN)
        {
            exec(KILL_CMD_WIN);
        } else
        {
            exec(KILL_CMD_LUX);
        }
        process.exit(1);
        return;
    }
    let id = 'pomelo_terminal_' + Date.now();
    connectToMaster(id, opts, function (client)
    {
        client.request(co.moduleId, {
            signal: signal, ids: opts.serverIds
        }, function (err, msg)
            {
                if (err)
                {
                    console.error(err);
                }
                if (signal === 'kill')
                {
                    if (msg.code === 'ok')
                    {
                        console.log('All the servers have been terminated!');
                    } else
                    {
                        console.log('There may be some servers remained:', msg.serverIds);
                    }
                }
                process.exit(0);
            });
    });
}