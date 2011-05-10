var sys = require('sys'),
    v = require('valentine');

function VarnishCodes(socket, callback_if_bad){
    this.all_codes = new Array;
    this.current_codes = [];
    this.current_scores = [];
    this.callback = callback_if_bad;
    this.socket = socket;
};
  
VarnishCodes.prototype.record_codes = function(codes){
    this.current_codes = codes;
    this.all_codes.unshift(codes);
    this.all_codes = this.all_codes.slice(0,10);
    sys.puts('all_codes length: ' + this.all_codes.length);
    this.current_scores = this.score_codes();
    this.send_to_clients();
};

VarnishCodes.prototype.score_codes = function(){
    var code_2s = v.filter(this.current_codes, function(e) { return e.match(/2\d\d/) }).length,
        code_3s = v.filter(this.current_codes, function(e) { return e.match(/3\d\d/) }).length,
        code_4s = v.filter(this.current_codes, function(e) { return e.match(/4\d\d/) }).length,
        code_5s = v.filter(this.current_codes, function(e) { return e.match(/5\d\d/) }).length,
        code_others = this.current_codes.length - (code_2s + code_3s + code_4s + code_5s);

    var scores = {
        code_2s: code_2s,
        code_3s: code_3s,
        code_4s: code_4s,
        code_5s: code_5s,
        code_others: code_others,
        total: this.current_codes.length
    };
    this.report_if_bad(scores);
    return scores;
};

VarnishCodes.prototype.report_if_bad = function(scores){
    var percent_of_5s = 100 * scores.code_5s / scores.total;
    sys.puts('percent_of_5s: ' + percent_of_5s);
    if (percent_of_5s > 1) {
        this.callback(percent_of_5s);
    };
};

VarnishCodes.prototype.send_to_clients = function(){
    this.socket.broadcast(this.current_scores);
};

exports.VarnishCodes = VarnishCodes;