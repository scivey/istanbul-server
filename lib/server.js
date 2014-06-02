'use strict';
var express = require('express');
var connect = require('connect');
var instrument = require('./instrument.js');

var server = module.exports = {
    _express: express
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

    app.use(connect.json());

    var match = params.match || server.defaults.match;   
    
    app.useIstanbul = function() {
        app.use(instrument.makeInstrumentMiddleware({
            rootDir: params.rootDir,
            match: match
        }));
        app.post('/api/summarize', function(req, res) {
            instrument.summarizeCoverage([req.body], function(err, summary) {
                if (err) {
                    res.status(400);
                    res.send({err: 'Malformed request.'});
                } else {
                    res.status(200);
                    res.send(summary);
                }
            });
        });
    };

    return app;
};

module.exports = server;
