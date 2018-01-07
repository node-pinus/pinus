
import * as program from 'commander';
import { CUR_DIR, INIT_PROJ_NOTICE, TIME_INIT } from '../utils/constants';
import { connectorType, emptyDirectory, confirm, abort, copy, mkdir, version } from '../utils/utils';

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as cliff from 'cliff'
import * as mkdirp from 'mkdirp'

export default function (program: program.CommanderStatic)
{
    program.command('init [path]')
        .description('create a new application')
        .action(function (path)
        {
            init(path || CUR_DIR);
        });
}
/**
 * Init application at the given directory `path`.
 *
 * @param {String} path
 */
function init(path : string)
{
    console.log(INIT_PROJ_NOTICE);
    connectorType(function (type : string)
    {
        emptyDirectory(path, function (empty : boolean)
        {
            if (empty)
            {
                process.stdin.destroy();
                createApplicationAt(path, type);
            } else
            {
                confirm('Destination is not empty, continue? (y/n) [no] ', function (force : boolean)
                {
                    process.stdin.destroy();
                    if (force)
                    {
                        createApplicationAt(path, type);
                    } else
                    {
                        abort(('Fail to init a project' as any).red);
                    }
                });
            }
        });
    });
}

/**
 * Create directory and files at the given directory `path`.
 *
 * @param {String} ph
 */
function createApplicationAt(ph : string, type : string)
{
    let name = path.basename(path.resolve(CUR_DIR, ph));
    copy(path.join(__dirname, '../../template/'), ph);
    mkdir(path.join(ph, 'game-server/logs'));
    mkdir(path.join(ph, 'shared'));
    // rmdir -r
    let rmdir = function (dir : string)
    {
        let list = fs.readdirSync(dir);
        for (let i = 0; i < list.length; i++)
        {
            let filename = path.join(dir, list[i]);
            let stat = fs.statSync(filename);
            if (filename === "." || filename === "..")
            {
            } else if (stat.isDirectory())
            {
                rmdir(filename);
            } else
            {
                fs.unlinkSync(filename);
            }
        }
        fs.rmdirSync(dir);
    };
    setTimeout(function ()
    {
        let unlinkFiles: string[];
        switch (type)
        {
            case '1':
                // use websocket
                unlinkFiles = ['game-server/app.ts.sio',
                    'game-server/app.ts.wss',
                    'game-server/app.ts.mqtt',
                    'game-server/app.ts.sio.wss',
                    'game-server/app.ts.udp',
                    'web-server/app.js.https',
                    'web-server/public/index.html.sio',
                    'web-server/public/js/lib/pinusclient.js',
                    'web-server/public/js/lib/pinusclient.js.wss',
                    'web-server/public/js/lib/build/build.js.wss',
                    'web-server/public/js/lib/socket.io.js'];
                for (let i = 0; i < unlinkFiles.length; ++i)
                {
                    fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
                }
                break;
            case '2':
                // use socket.io
                unlinkFiles = ['game-server/app.ts',
                    'game-server/app.ts.wss',
                    'game-server/app.ts.udp',
                    'game-server/app.ts.mqtt',
                    'game-server/app.ts.sio.wss',
                    'web-server/app.js.https',
                    'web-server/public/index.html',
                    'web-server/public/js/lib/component.tson',
                    'web-server/public/js/lib/pomeloclient.js.wss'];
                for (let i = 0; i < unlinkFiles.length; ++i)
                {
                    fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
                }

                fs.renameSync(path.resolve(ph, 'game-server/app.ts.sio'), path.resolve(ph, 'game-server/app.ts'));
                fs.renameSync(path.resolve(ph, 'web-server/public/index.html.sio'), path.resolve(ph, 'web-server/public/index.html'));

                rmdir(path.resolve(ph, 'web-server/public/js/lib/build'));
                rmdir(path.resolve(ph, 'web-server/public/js/lib/local'));
                break;
            case '3':
                // use websocket wss
                unlinkFiles = ['game-server/app.ts.sio',
                    'game-server/app.ts',
                    'game-server/app.ts.udp',
                    'game-server/app.ts.sio.wss',
                    'game-server/app.ts.mqtt',
                    'web-server/app.ts',
                    'web-server/public/index.html.sio',
                    'web-server/public/js/lib/pomeloclient.js',
                    'web-server/public/js/lib/pomeloclient.js.wss',
                    'web-server/public/js/lib/build/build.js',
                    'web-server/public/js/lib/socket.io.js'];
                for (let i = 0; i < unlinkFiles.length; ++i)
                {
                    fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
                }

                fs.renameSync(path.resolve(ph, 'game-server/app.ts.wss'), path.resolve(ph, 'game-server/app.ts'));
                fs.renameSync(path.resolve(ph, 'web-server/app.js.https'), path.resolve(ph, 'web-server/app.js'));
                fs.renameSync(path.resolve(ph, 'web-server/public/js/lib/build/build.js.wss'), path.resolve(ph, 'web-server/public/js/lib/build/build.js'));
                break;
            case '4':
                // use socket.io wss
                unlinkFiles = ['game-server/app.ts.sio',
                    'game-server/app.ts',
                    'game-server/app.ts.udp',
                    'game-server/app.ts.wss',
                    'game-server/app.ts.mqtt',
                    'web-server/app.js',
                    'web-server/public/index.html',
                    'web-server/public/js/lib/pomeloclient.js'];
                for (let i = 0; i < unlinkFiles.length; ++i)
                {
                    fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
                }

                fs.renameSync(path.resolve(ph, 'game-server/app.ts.sio.wss'), path.resolve(ph, 'game-server/app.ts'));
                fs.renameSync(path.resolve(ph, 'web-server/app.js.https'), path.resolve(ph, 'web-server/app.js'));
                fs.renameSync(path.resolve(ph, 'web-server/public/index.html.sio'), path.resolve(ph, 'web-server/public/index.html'));
                fs.renameSync(path.resolve(ph, 'web-server/public/js/lib/pomeloclient.js.wss'), path.resolve(ph, 'web-server/public/js/lib/pomeloclient.js'));

                rmdir(path.resolve(ph, 'web-server/public/js/lib/build'));
                rmdir(path.resolve(ph, 'web-server/public/js/lib/local'));
                fs.unlinkSync(path.resolve(ph, 'web-server/public/js/lib/component.tson'));
                break;
            case '5':
                // use socket.io wss
                unlinkFiles = ['game-server/app.ts.sio',
                    'game-server/app.ts',
                    'game-server/app.ts.wss',
                    'game-server/app.ts.mqtt',
                    'game-server/app.ts.sio.wss',
                    'web-server/app.js.https',
                    'web-server/public/index.html',
                    'web-server/public/js/lib/component.tson',
                    'web-server/public/js/lib/pomeloclient.js.wss'];
                for (let i = 0; i < unlinkFiles.length; ++i)
                {
                    fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
                }

                fs.renameSync(path.resolve(ph, 'game-server/app.ts.udp'), path.resolve(ph, 'game-server/app.ts'));
                rmdir(path.resolve(ph, 'web-server/public/js/lib/build'));
                rmdir(path.resolve(ph, 'web-server/public/js/lib/local'));
                break;
            case '6':
                // use socket.io
                unlinkFiles = ['game-server/app.ts',
                    'game-server/app.ts.wss',
                    'game-server/app.ts.udp',
                    'game-server/app.ts.sio',
                    'game-server/app.ts.sio.wss',
                    'web-server/app.js.https',
                    'web-server/public/index.html',
                    'web-server/public/js/lib/component.tson',
                    'web-server/public/js/lib/pomeloclient.js.wss'];
                for (let i = 0; i < unlinkFiles.length; ++i)
                {
                    fs.unlinkSync(path.resolve(ph, unlinkFiles[i]));
                }

                fs.renameSync(path.resolve(ph, 'game-server/app.ts.mqtt'), path.resolve(ph, 'game-server/app.ts'));
                fs.renameSync(path.resolve(ph, 'web-server/public/index.html.sio'), path.resolve(ph, 'web-server/public/index.html'));

                rmdir(path.resolve(ph, 'web-server/public/js/lib/build'));
                rmdir(path.resolve(ph, 'web-server/public/js/lib/local'));
                break;
        }
        let replaceFiles = ['game-server/app.ts',
            'game-server/package.json',
            'web-server/package.json'];
        for (let j = 0; j < replaceFiles.length; j++)
        {
            let str = fs.readFileSync(path.resolve(ph, replaceFiles[j])).toString();
            fs.writeFileSync(path.resolve(ph, replaceFiles[j]), str.replace('$', name));
        }
        let f = path.resolve(ph, 'game-server/package.json');
        let content = fs.readFileSync(f).toString();
        fs.writeFileSync(f, content.replace('#', version));
    }, TIME_INIT);
}

