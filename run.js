var instrument = require('./lib/instrument.js');
var fs = require('fs-extra');

var server = require('./lib/server.js');
var app = server.create({
    port: 9005,
    rootDir: __dirname + '/test_data/public',
    match: function(req) {
        return req.url.indexOf('foo') !== -1;
    }
});
