let cp = require('child_process');
import * as fs from "fs"
let vm = require('vm');
let path = require('path');
var util = require('util');

class Starter
{
    constructor()
    {

    }

    run(main: any, message: any, clients: Array<any>)
    {
        if (!clients)
        {
            clients = ['127.0.0.1'];
            this.prepare(main, message, clients);
        } else
        {
            this.prepare(main, message, clients);
        }
    };

    prepare(main: string, message: { agent: any }, clients: Array<any>)
    {
        let self = this;
        let count = parseInt(message.agent, 10) || 1;
        for (let ipindex in clients)
        {
            for (let i = 0; i < count; i++)
            {
                let cmd = 'cd ' + process.cwd() + ' && ' + process.execPath + ' ' + main + ' client > log/.log';
                let ip = clients[ipindex];
                if (ip === '127.0.0.1')
                {
                    self.localrun(cmd);
                } else
                {
                    self.sshrun(cmd, ip);
                }
            }
        }
    }

    sshrun(cmd: string, host: number | string, callback?: Function)
    {
        let hosts = [host];
        log('Executing ' + (<any>$(cmd)).yellow + ' on ' + (<any>$(hosts.join(', '))).blue);
        let wait = 0;
        let data: Array<{ host: number | string, out: any }> = [];
        if (hosts.length > 1)
        {
            starter.parallelRunning = true;
        }
        hosts.forEach(function (host)
        {
            wait += 1;
            spawnProcess('ssh', [host, cmd], function (err: Error, out: any)
            {
                if (!err)
                {
                    data.push({
                        host: host,
                        out: out
                    });
                }
                done(err);
            });
        });

        let error: Error
        function done(err: Error)
        {
            error = error || err;
            if (--wait === 0)
            {
                starter.parallelRunning = false;
                if (error)
                {
                    starter.abort('FAILED TO RUN, return code: ' + error);
                } else if (callback)
                {
                    callback(data);
                }
            }
        }

    };

    localrun(cmd: string, callback?: Function)
    {
        log('Executing ' + (<any>$(cmd)).green + ' locally');
        spawnProcess(cmd, ['', ''], function (err: Error, data: string)
        {
            if (err)
            {
                starter.abort('FAILED TO RUN, return code: ' + err);
            } else
            {
                if (callback) callback(data);
            }
        });
    };

    set(key: number, def: string)
    {
        if (typeof def === 'function')
        {
            starter.__defineGetter__(key, def);
        } else
        {
            starter.__defineGetter__(key, function ()
            {
                return def;
            });
        }
    };

    load(file: string)
    {
        if (!file) throw new Error('File not specified');
        log('Executing compile ' + file);
        let code = fs.readFileSync(file).toString();
        let script = vm.createScript(code, file);
        script.runInNewContext(this);
    };

    abort(msg: string)
    {
        log((<any>$(msg)).red);
        //process.exit(1);
    };
}

let starter: any = new Starter();

let log = function (str?: string)
{
    util.puts([].join.call(arguments, ' '));
};

/**
 *begin notify to run agent
 * 
 *
 */

function addBeauty(prefix: string, buf: string)
{
    let out = prefix + ' ' + buf
        .toString()
        .replace(/\s+$/, '')
        .replace(/\n/g, '\n' + prefix);
    return (<any>$(out)).green;
}

function spawnProcess(command: string, options: Array<any>, callback: Function)
{
    let child = null;
    if (!!options[0])
    {
        child = cp.spawn(command, options);

    } else
    {
        child = cp.exec(command, options);
    }

    let prefix = command === 'ssh' ? '[' + options[0] + '] ' : '';
    prefix = (<any>$(prefix)).grey;

    //child.stderr.on('data', function (chunk) {
    //    log(addBeauty(chunk));
    //});

    let res: Array<any> = [];
    child.stdout.on('data', function (chunk: any)
    {
        res.push(chunk.toString());
        log(addBeauty(chunk));
    });

    function addBeauty(buf: string)
    {
        return prefix + buf
            .toString()
            .replace(/\s+$/, '')
            .replace(/\n/g, '\n' + prefix);
    }

    child.on('exit', function (code: number)
    {
        if (callback)
        {
            callback(code === 0 ? null : code, res && res.join('\n'));
        }
    });
}





// Stylize a string
class Stylize
{
    styles: any;
    static $: any;
    constructor()
    {
        this.styles = {
            'bold': [1, 22],
            'italic': [3, 23],
            'underline': [4, 24],
            'cyan': [96, 39],
            'blue': [34, 39],
            'yellow': [33, 39],
            'green': [32, 39],
            'red': [31, 39],
            'grey': [90, 39],
            'green-hi': [92, 32],
        }
    }
    output(this: any, str: string, style: keyof typeof this.styles)
    {
        return '\033[' + this.styles[style][0] + 'm' + str +
            '\033[' + this.styles[style][1] + 'm';
    }
}

// function stylize(str, style) {
//     let styles = {
//         'bold'      : [1,  22],
//         'italic'    : [3,  23],
//         'underline' : [4,  24],
//         'cyan'      : [96, 39],
//         'blue'      : [34, 39],
//         'yellow'    : [33, 39],
//         'green'     : [32, 39],
//         'red'       : [31, 39],
//         'grey'      : [90, 39],
//         'green-hi'  : [92, 32],
//     };
//     return '\033[' + styles[style][0] + 'm' + str +
//         '\033[' + styles[style][1] + 'm';
// };

function $(str: String)
{
    str = new (String)(str);
    let stylize = new Stylize();
    ['bold', 'grey', 'yellow', 'red', 'green', 'cyan', 'blue', 'italic', 'underline'].forEach(function (style)
    {
        Object.defineProperty(str, style, {
            get: function (this: any)
            {
                return $(stylize.output(this, style));
            }
        });
    });
    return str;
};

Stylize.$ = $;

export { starter }