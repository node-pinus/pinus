"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const http = require("http");
const fs = require("fs");
var qputs = console.log;
const events_1 = require("events");
const __ = require("underscore");
const monitor_1 = require("../monitor/monitor");
/** By default, HttpServer knows how to return static files from the current directory. Add new route
regexs using HttpServer.on(). */
class HttpServer extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.routes = [];
        this.running = false;
    }
    /** Start the server listening on the given port */
    start(port, hostname) {
        if (this.running) {
            return;
        }
        this.running = true;
        var self = this;
        port = port || 8000;
        self.hostname = hostname || 'localhost';
        self.port = port;
        self.connections = [];
        self.server = http.createServer(function (req, res) { self.route_(req, res); });
        self.server.on('connection', function (c) {
            // We need to track incoming connections, beause Server.close() won't terminate active
            // connections by default.
            c.on('close', function () {
                var idx = self.connections.indexOf(c);
                if (idx !== -1) {
                    self.connections.splice(idx, 1);
                }
            });
            self.connections.push(c);
        });
        self.server.listen(this.port, this.hostname);
        self.emit('start', self.hostname, self.port);
        return self;
    }
    ;
    /** Terminate the server */
    stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        this.connections.forEach(function (c) { c.destroy(); });
        this.server.close();
        this.server = null;
        this.emit('end');
    }
    ;
    /** When an incoming request matches a given regex, route it to the provided handler:
    function(url, ServerRequest, ServerResponse) */
    addRoute(regex, handler) {
        this.routes.unshift({ regex: regex, handler: handler });
        return this;
    }
    ;
    removeRoute(regex, handler) {
        this.routes = this.routes.filter(function (r) {
            return !((regex === r.regex) && (!handler || handler === r.handler));
        });
        return this;
    }
    ;
    route_(req, res) {
        for (var i = 0; i < this.routes.length; i++) {
            if (req.url.match(this.routes[i].regex)) {
                this.routes[i].handler(req.url, req, res);
                return;
            }
        }
        if (req.method === 'GET') {
            this.serveFile_('.' + req.url, res);
        }
        else {
            res.writeHead(405, { "Content-Length": "0" });
            res.end();
        }
    }
    ;
    doReport(response) {
        var pdata = monitor_1.getData();
        //console.log('pdata %j',pdata);
        var mdata = [];
        var _show = false;
        __.each(pdata, function (val, key) {
            var single = {};
            _show = true;
            single['name'] = key;
            single['uid'] = key;
            var keycolumns = [];
            var maxId = 0;
            __.each(val, function (kval, akey) {
                var _length = __.size(kval);
                if (_length > maxId)
                    maxId = _length;
                if (_length > 0)
                    keycolumns.push(akey);
            });
            var gcolumns = [];
            gcolumns.push('users');
            var glastkeyData = {};
            __.each(keycolumns, function (dkey) { gcolumns.push(dkey); });
            var grows = [];
            for (var i = 0; i < maxId; i++) {
                var rows = [];
                rows.push(i + 1);
                __.each(keycolumns, function (dkey) {
                    //console.log('dkey' + dkey + ' ' +i + JSON.stringify(val[dkey]))
                    rows.push(val[dkey][i] || 0);
                    //_vaild = true;
                });
                grows.push(rows);
            }
            var gsummary = {};
            __.each(keycolumns, function (dkey) {
                var summary = {};
                var kdata = val[dkey];
                var min = Number.MAX_VALUE, max = 0;
                var sindex = 0, sum = 0;
                __.each(kdata, function (time) {
                    if (time > max)
                        max = time;
                    if (time < min)
                        min = time;
                    sum += time;
                    ++sindex;
                });
                var avg = Math.round(sum / sindex);
                summary = { 'max': max, 'min': min, 'avg': avg, 'qs': Math.round(i * 1000 / avg) };
                gsummary[dkey] = (summary);
            });
            single['summary'] = gsummary;
            single['charts'] = { "latency": { "name": "robot", "uid": single['uid'], "columns": gcolumns, "rows": grows } };
            if (grows.length > 0)
                mdata.push(single);
        });
        if (_show) {
            var data = JSON.stringify(mdata);
            //response.writeHead(200, { 'Content-Length': pdata.length });
            response.write(data, "binary");
        }
        response.end();
    }
    serveFile_(file, response) {
        if (file.lastIndexOf('report') != -1) {
            this.doReport(response);
            return;
        }
        if (file === './')
            file = 'index.html';
        file = __dirname + '/' + file;
        fs.stat(file, function (err, stat) {
            if (err) {
                response.writeHead(404, { "Content-Type": "text/plain" });
                response.write("Cannot find file: " + file);
                response.end();
                return;
            }
            fs.readFile(file, "binary", function (err, data) {
                if (err) {
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    response.write("Error opening file " + file + ": " + err);
                }
                else {
                    if (file.lastIndexOf('.html') == -1) {
                        response.writeHead(200, { 'Content-Length': data.length });
                        response.write(data, "binary");
                    }
                    else {
                        response.writeHead(200, { 'Content-Length': data.length, "Content-Type": "text/html; charset=utf-8" });
                        response.write(data, "binary");
                    }
                }
                response.end();
            });
        });
    }
    ;
}
exports.HttpServer = HttpServer;
// =================
// Singletons
// =================
/** The global HTTP server used by nodeload */
exports.HTTP_SERVER = new HttpServer();
exports.HTTP_SERVER.on('start', function (hostname, port) {
    console.log(`Started HTTP server on : http://${hostname}:${port}`);
});
exports.HTTP_SERVER.on('end', function () {
    qputs('Shutdown HTTP server.');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zb2xlL2h0dHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBdUM7QUFDdkMsZUFBZTtBQUNmLHVDQUF1QztBQUN2QyxFQUFFO0FBQ0YsOERBQThEO0FBQzlELEVBQUU7QUFDRiw4RkFBOEY7QUFDOUYsNkZBQTZGO0FBQzdGLCtCQUErQjtBQUMvQixHQUFHO0FBQ0gsNkJBQTZCO0FBQzdCLHlCQUF5QjtBQUd6QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3hCLG1DQUFzQztBQUV0QyxpQ0FBaUM7QUFDakMsZ0RBQTZDO0FBQzdDO2dDQUNnQztBQUVoQyxnQkFBd0IsU0FBUSxxQkFBWTtJQUE1Qzs7UUFNSSxXQUFNLEdBQXdDLEVBQUUsQ0FBQztRQUNqRCxZQUFPLEdBQUcsS0FBSyxDQUFDO0lBNkxwQixDQUFDO0lBNUxHLG1EQUFtRDtJQUNuRCxLQUFLLENBQUMsSUFBYSxFQUFFLFFBQWlCO1FBRWxDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDO1FBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUVwQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLElBQUksV0FBVyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBRXRCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENB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