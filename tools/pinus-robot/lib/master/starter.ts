var starter;
var cp = require('child_process');
var fs = require('fs');
var vm = require('vm');
var path = require('path');
var util = require('util');

function Starter(){}

var starter = module.exports = new Starter();

var log = function () {
    util.puts([].join.call(arguments, ' '));
};

/**
 *begin notify to run agent
 * 
 *
 */
Starter.prototype.run = function(main,message,clients){
    if (!clients) {
        clients = ['127.0.0.1'];
        this.prepare(main,message,clients);
    } else {
        this.prepare(main,message,clients);
    }
};

Starter.prototype.prepare = function(main,message,clients){
    var self = this;
	var count = parseInt(message.agent,10) || 1;
    for(var ipindex in clients) {
        for (var i = 0;i<count;i++) {
        var cmd = 'cd ' + process.cwd() + ' && ' + process.execPath + ' ' + main + ' client > log/.log';
            var ip = clients[ipindex];
            if (ip==='127.0.0.1') {
                self.localrun(cmd);
            } else {
                self.sshrun(cmd,ip);
            }
        }
    }
}

Starter.prototype.sshrun = function (cmd,host,callback) {
	  var hosts = [host];
    log('Executing ' + $(cmd).yellow + ' on ' + $(hosts.join(', ')).blue);
    var wait = 0;
    data = [];
    if (hosts.length > 1) {
        parallelRunning = true;
    }
    hosts.forEach(function (host) {
        wait += 1;
        spawnProcess('ssh', [host, cmd], function (err, out) {
            if (!err) {
                data.push({
                    host: host,
                    out: out
                });
            }
            done(err);
        });
    });

    var error;
    function done(err) {
        error = error || err;
        if (--wait === 0) {
            starter.parallelRunning = false;
            if (error) {
                starter.abort('FAILED TO RUN, return code: ' + error);
            } else if (callback) {
                callback(data);
            }
        }
    }

};

Starter.prototype.localrun = function (cmd, callback) {
    log('Executing ' + $(cmd).green + ' locally');
    spawnProcess(cmd, ['',''], function (err, data) {
        if (err) {
            starter.abort('FAILED TO RUN, return code: ' + err);
        } else {
            if (callback) callback(data);
        }
    });
};


function addBeauty(prefix,buf) {
    var out =  prefix + ' ' + buf
        .toString()
        .replace(/\s+$/, '')
        .replace(/\n/g, '\n' + prefix);
    return $(out).green;
}

function spawnProcess(command, options, callback) {
    var child = null;
    if (!!options[0]) {
    	  child = cp.spawn(command, options);

    } else {
    	  child = cp.exec(command, options);
    }

    var prefix = command === 'ssh' ? '[' + options[0] + '] ' : '';
    prefix = $(prefix).grey;
    
    //child.stderr.on('data', function (chunk) {
    //    log(addBeauty(chunk));
    //});

    var res = [];
    child.stdout.on('data', function (chunk) {
        res.push(chunk.toString());
        log(addBeauty(chunk));
    });

    function addBeauty(buf) {
        return prefix + buf
            .toString()
            .replace(/\s+$/, '')
            .replace(/\n/g, '\n' + prefix);
    }

    child.on('exit', function (code) {
        if (callback) {
            callback(code === 0 ? null : code, res && res.join('\n'));
        }
    });
}


Starter.prototype.set = function (key, def) {
    if (typeof def === 'function') {
        starter.__defineGetter__(key, def);
    } else {
        starter.__defineGetter__(key, function () {
            return def;
        });
    }
};

Starter.prototype.load = function (file) {
    if (!file) throw new Error('File not specified');
    log('Executing compile ' + file);
    var code = coffee.compile(fs.readFileSync(file).toString());
    var script = vm.createScript(code, file);
    script.runInNewContext(this);
};

Starter.prototype.abort = function (msg) {
    log($(msg).red);
    //process.exit(1);
};


// Stylize a string
function stylize(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'italic'    : [3,  23],
        'underline' : [4,  24],
        'cyan'      : [96, 39],
        'blue'      : [34, 39],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39],
        'grey'      : [90, 39],
        'green-hi'  : [92, 32],
    };
    return '\033[' + styles[style][0] + 'm' + str +
        '\033[' + styles[style][1] + 'm';
};

function $(str) {
    str = new(String)(str);
    ['bold', 'grey', 'yellow', 'red', 'green', 'cyan', 'blue', 'italic', 'underline'].forEach(function (style) {
        Object.defineProperty(str, style, {
            get: function () {
                return $(stylize(this, style));
            }
        });
    });
    return str;
};

stylize.$ = $;
