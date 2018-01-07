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
    start(robotMasterUrl, port, hostname) {
        if (this.running) {
            return;
        }
        this.running = true;
        this.robotMasterUrl = robotMasterUrl;
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
    serveFile_(basefile, response) {
        if (basefile.lastIndexOf('report') != -1) {
            this.doReport(response);
            return;
        }
        if (basefile === './')
            basefile = 'index.html';
        let file = __dirname + '/' + basefile;
        fs.stat(file, (err, stat) => {
            if (err) {
                response.writeHead(404, { "Content-Type": "text/plain" });
                response.write("Cannot find file: " + file);
                response.end();
                return;
            }
            fs.readFile(file, "binary", (err, data) => {
                if (err) {
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    response.write("Error opening file " + file + ": " + err);
                }
                else {
                    if (file.lastIndexOf('.html') == -1) {
                        if (basefile == "./js/webclient.js") {
                            data = data.replace('${robotMasterUrl}', this.robotMasterUrl);
                        }
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
    console.log(`Started Robot Master Http server on : http://${hostname}:${port}`);
});
exports.HTTP_SERVER.on('end', function () {
    qputs('Shutdown Robot Master Http server.');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb25zb2xlL2h0dHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBdUM7QUFDdkMsZUFBZTtBQUNmLHVDQUF1QztBQUN2QyxFQUFFO0FBQ0YsOERBQThEO0FBQzlELEVBQUU7QUFDRiw4RkFBOEY7QUFDOUYsNkZBQTZGO0FBQzdGLCtCQUErQjtBQUMvQixHQUFHO0FBQ0gsNkJBQTZCO0FBQzdCLHlCQUF5QjtBQUd6QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3hCLG1DQUFzQztBQUV0QyxpQ0FBaUM7QUFDakMsZ0RBQTZDO0FBQzdDO2dDQUNnQztBQUVoQyxnQkFBd0IsU0FBUSxxQkFBWTtJQUE1Qzs7UUFNSSxXQUFNLEdBQXdDLEVBQUUsQ0FBQztRQUNqRCxZQUFPLEdBQUcsS0FBSyxDQUFDO0lBbU1wQixDQUFDO0lBak1HLG1EQUFtRDtJQUNuRCxLQUFLLENBQUMsY0FBdUIsRUFBRyxJQUFhLEVBQUUsUUFBaUI7UUFFNUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUM7UUFBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBRXJDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUNoQixJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsSUFBSSxXQUFXLENBQUM7UUFDeEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFFdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsR0FBRyxFQUFFLEdBQUcs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