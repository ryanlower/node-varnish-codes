
var express = require('express'),
    sys = require('sys'),
    util = require('util'),
    v = require('valentine'),
    http = require('http'),
    io = require('socket.io'),
    spawn = require('child_process').spawn,
    mailer = require('mailer');

var VarnishCodes = require('./varnish_codes.js').VarnishCodes;

var config = require('./conf/config.js');

var app = module.exports = express.createServer();
var socket = io.listen(app);

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

var varnish_codes = new VarnishCodes(socket, function(percent_of_5s){
  var mail = {
    host: 'smtp.sendgrid.net',
    port: '25',
    authentication: 'login',
    username: config.sendgrid.username,
    password: config.sendgrid.password,
    to: config.sendgrid.to,
    from: config.sendgrid.from,
    subject: 'Varnish: ' + percent_of_5s + '% of requests are 500-ing',
    body: percent_of_5s + '% of requests are 500-ing'
    }
    mailer.send(mail);
});
varnish_codes.record_codes(['200', '200']);

var v_log = spawn('varnishlog', ['-c', '-i TxStatus']);

v_log.stdout.on('data', function (data_buffer) {
  var codes = [];
  var data_string = data_buffer.toString('utf8');
  var data_array = data_string.split(/\n/);
  for (e in data_array) {
    code = data_array[e].split(/\s/).pop();
    if (code.match(/\d\d\d/)) {
      codes.push(code);
    }
  }
  varnish_codes.record_codes(codes);
});



// Routes

app.get('/', function(req, res){
  res.render('index', {
    data: varnish_codes.all_codes,
    scores: varnish_codes.current_scores
  });
});

app.get('/health', function(req, res){
  if (varnish_codes.percent_of_5s > 10) {
    throw new Error('Bad Health! (50x percent: ' + varnish_codes.percent_of_5s + '%)');
  };
  res.end();
});



// Server

if (!module.parent) {
  app.listen(82);
  console.log("Express server listening on port %d", app.address().port);
}



// Socket.io
socket.on('connection', function(client){ 
  client.send(varnish_codes.current_scores);
});

