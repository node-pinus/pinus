var m = new Buffer('hello');
console.log('old length %d', m.length);
var p = JSON.stringify(m);
var q = JSON.parse(p);
console.log(p);
console.log('stringify length %d', new Buffer(p).length);
console.log(q);
var buf = new Buffer(q.data);
console.log(buf.toString())