// ------------------------------------
// HTTP Server 
// ------------------------------------
//
// This file defines HttpServer and the singleton HTTP_SERVER.
//
// This file defines a generic HTTP server that serves static files and that can be configured
// with new routes. It also starts the nodeload HTTP server unless require('nodeload/config')
// .disableServer() was called.
// 
var BUILD_AS_SINGLE_FILE;
if (!BUILD_AS_SINGLE_FILE) {
var http = require('http');
var fs = require('fs');
var util = require('../common/util');
var qputs = util.qputs;
var EventEmitter = require('events').EventEmitter;
}

var stat  = require('../monitor/stat');
var __ = require('underscore');
/** By default, HttpServer knows how to return static files from the current directory. Add new route 
regexs using HttpServer.on(). */
var HttpServer = exports.HttpServer = function HttpServer() {
    this.routes = [];
    this.running = false;
};
util.inherits(HttpServer, EventEmitter);
/** Start the server listening on the given port */
HttpServer.prototype.start = function(port, hostname) {
    if (this.running) { return; }
    this.running = true;

    var self = this;
    port = port || 8000;
    self.hostname = hostname || 'localhost';
    self.port = port;
    self.connections = [];

    self.server = http.createServer(function(req, res) { self.route_(req, res); });
    self.server.on('connection', function(c) { 
        // We need to track incoming connections, beause Server.close() won't terminate active
        // connections by default.
        c.on('close', function() {
            var idx = self.connections.indexOf(c);
            if (idx !== -1) {
                self.connections.splice(idx, 1);
            }
        });
        self.connections.push(c);
    });
    self.server.listen(port, hostname);

    self.emit('start', self.hostname, self.port);
    return self;
};
/** Terminate the server */
HttpServer.prototype.stop = function() {
    if (!this.running) { return; }
    this.running = false;
    this.connections.forEach(function(c) { c.destroy(); });
    this.server.close();
    this.server = null;
    this.emit('end');
};
/** When an incoming request matches a given regex, route it to the provided handler:
function(url, ServerRequest, ServerResponse) */
HttpServer.prototype.addRoute = function(regex, handler) {
    this.routes.unshift({regex: regex, handler: handler});
    return this;
};
HttpServer.prototype.removeRoute = function(regex, handler) {
    this.routes = this.routes.filter(function(r) {
        return !((regex === r.regex) && (!handler || handler === r.handler));
    });
    return this;
};
HttpServer.prototype.route_ = function(req, res) {
    for (var i = 0; i < this.routes.length; i++) {
        if (req.url.match(this.routes[i].regex)) {
            this.routes[i].handler(req.url, req, res);
            return;
        }
    }
    if (req.method === 'GET') {
        this.serveFile_('.' + req.url, res);
    } else {
        res.writeHead(405, {"Content-Length": "0"});
        res.end();
    }
};


function doReport(response) {
	var pdata = stat.getData();
	//console.log('pdata %j',pdata);
	var mdata = [];
	var _show = false;
  __.each(pdata,function(val,key){
    	var single = {};
  		_show = true;
  		single['name'] = key;
  		single['uid'] = key;
  		var keycolumns = [];
  		var maxId = 0;
  		__.each(val,function(kval,akey){
  			var _length = __.size(kval);
  			if (_length>maxId) maxId = _length;
  			if (_length>0) keycolumns.push(akey);
  		});
  		var gcolumns = [];
  		gcolumns.push('users');
  		var glastkeyData = {};
  		__.each(keycolumns,function(dkey){gcolumns.push(dkey);});	
  		var grows = [];
  		for (var i = 0;i< maxId;i++) {
  			var rows = [];
	  		rows.push(i+1);
  			__.each(keycolumns,function(dkey){
	  			//console.log('dkey' + dkey + ' ' +i + JSON.stringify(val[dkey]))
  				rows.push(val[dkey][i] || 0);
  				//_vaild = true;
	  		});	
  			grows.push(rows);
  		}
  		var gsummary = {};
  		__.each(keycolumns,function(dkey){
  			var summary = {};
  			var kdata = val[dkey];
				var min = Number.MAX_VALUE,max = 0;
				var sindex = 0,sum = 0;
				__.each(kdata,function(time){
					if (time>max) max = time;
					if (time<min) min = time;
					sum +=time;
					++sindex;
				});
				var avg = Math.round(sum/sindex);
				summary = {'max':max,'min':min,'avg':avg,'qs':Math.round(i*1000/avg)};
				gsummary[dkey] = (summary);
  		});	
			single['summary'] = gsummary;
  		single['charts'] =  {"latency":{"name":"robot","uid":single['uid'],"columns":gcolumns,"rows":grows}};
  		if (grows.length>0)	mdata.push(single);
  });
  if (_show) {
  	var data = JSON.stringify(mdata);
  	//response.writeHead(200, { 'Content-Length': pdata.length });
  	response.write(data, "binary");
  }
	response.end();
}


HttpServer.prototype.serveFile_ = function(file, response) {
		if (file.lastIndexOf('report')!=-1) {
	  	doReport(response);
	  	return;
	  }
		if (file==='./')
			file = 'index.html';
	  file = process.cwd() + '/node_modules/pomelo-robot/lib/console/' + file;
    fs.stat(file, function(err, stat) {
        if (err) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("Cannot find file: " + file);
            response.end();
            return;
        }

        fs.readFile(file, "binary", function (err, data) {
            if (err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write("Error opening file " + file + ": " + err);
            } else {
            		if (file.lastIndexOf('.html')==-1) {
            			response.writeHead(200, { 'Content-Length': data.length });
            			response.write(data, "binary");
            		} else {
            			response.writeHead(200, { 'Content-Length': data.length,"Content-Type":"text/html; charset=utf-8"});
            			response.write(data, "binary");
            		}
            }
            response.end();
        });
    });
};

// =================
// Singletons
// =================
/** The global HTTP server used by nodeload */
var HTTP_SERVER = exports.HTTP_SERVER = new HttpServer();
HTTP_SERVER.on('start', function(hostname, port) {
    qputs('Started HTTP server on ' + hostname + ':' + port + '.');
});

HTTP_SERVER.on('end', function() {
    qputs('Shutdown HTTP server.');
});
 
