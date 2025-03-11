var express = require('express');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
var app = express();

  app.use(methodOverride());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/public');
  app.set('view options', {layout: false});
  app.set('basepath',__dirname + '/public');

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
