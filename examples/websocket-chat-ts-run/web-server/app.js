var express = require('express');
var app = express();


let env = app.get('env');
if(env=="development"){
  app.use(express.static(__dirname + '/public'));
}
if(env == "production"){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
}

console.log("Web server has started.\nPlease log on http://127.0.0.1:3001/index.html");
app.listen(3001);
