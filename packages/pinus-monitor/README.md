[![Build Status](https://travis-ci.org/node-pinus/pinus-monitor.svg?branch=master)](https://travis-ci.org/node-pinus/pinus-monitor)

## Monitor

Simple, comprehensive monitoring tool for operating-system and process in nodejs.
* Tags: nodejs, monitor

## Installation

	$ npm install -g pinus-monitor

## Usage

	var monitor = require(pinus-monitor);

	var param = {
		pid: process.pid,
		serverId: 'node-1'
	};

	monitor.psmonitor.getPsInfo(param, function(err, data) {
		console.log('process information is :', data);
	});

	monitor.sysmonitor.getSysInfo(function(err, data) {
		console.log('operating-system information is :', data);
	});

## Features

  * Simple and comprehensive
  * Only for linux or mac 
  * SystemMonitor aims to monitor system info, such as hostname, loadAvg, mem, CPU(I/O), DISK(O/I) etc, according to the command 'iostat'
  * ProcessMonitor aims to monitor process info, such as serverId, serverType, cpu%, mem%, vsz, rss etc, according to the command 'ps auxw'


## License

(The MIT License)

Copyright (c) 2012-2013 NetEase inc. and other contributors.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
