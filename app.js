
var express = require('express'),
    sys = require('sys'),
    util = require('util'),
    v = require('valentine'),
    spawn = require('child_process').spawn;

var VarnishCodes = require('./varnish_codes.js').VarnishCodes;

var app = module.exports = express.createServer();



// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});



// App code

var varnish_codes = new VarnishCodes(function(){
  sys.puts('ERROR!');
});

var v_log = spawn('varnishlog', ['-c', '-i TxStatus']);

v_log.stdout.on('data', function (data_buffer) {
  var codes = [];
  var data_string = data_buffer.toString('utf8');
  var data_array = data_string.split(/\n/);
  for (e in data_array) {
    code = data_array[e].split(/\s/).pop();
    codes.push(code);
  }
  varnish_codes.record_codes(codes);
});



// Routes

app.get('/', function(req, res){
  res.render('index', {
    data: varnish_codes.all_codes
  });
});



// Server

if (!module.parent) {
  app.listen(82);
  console.log("Express server listening on port %d", app.address().port);
}
