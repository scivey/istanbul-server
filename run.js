var instrument = require('./lib/instrument.js');
var fs = require('fs-extra');
var connect = require('connect');

var server = require('./lib/server.js');
var app = server.create({
    rootDir: __dirname + '/test_data/public',
    match: function(req) {
        return req.url.indexOf('foo') !== -1;
    }
});

app.use(connect.logger('dev'));
app.useIstanbul();
app.listen(9007);