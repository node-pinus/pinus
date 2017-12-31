var zlibjs = require('browserify-zlib');

var num = 20000;
var start = null;

var message = {
	key: 'hello'
}

start = Date.now();

function run() {
	for (var i = 0; i < num; i++) {
		zlibjs.gunzipSync(zlibjs.gzipSync(JSON.stringify(message)));
	}

	var now = Date.now();
	var cost = now - start;
	console.log('run %d num requests cost: %d ops/sec', num, cost, (num / (cost / 1000)).toFixed(2));
	run();
}

run();