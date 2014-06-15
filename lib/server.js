'use strict';
var express = require('express');
var middleware = require('./middleware');
var bodyParser = require('body-parser');
var server = module.exports = {
    _express: express,
    _bodyParser: bodyParser
};

server.defaults = {
    match: function(req) {
        if (req.url.indexOf('.js') !== -1) {
            return true;
        }
        return false;
    }
};

server.create = function(params) {

    var app = server._express();

    app.use(server._bodyParser.json());

    var match = params.match || server.defaults.match;   
    
    app.useIstanbul = function() {
        app.use(middleware.makeInstrumentMiddleware({
            rootDir: params.rootDir,
            match: match
        }));
        app.post('/api/summarize', middleware.makeSummarizeMiddleware());
    };

    return app;
};

module.exports = server;
