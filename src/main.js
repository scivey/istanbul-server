var express = require('express');
var connect = require('connect');
var path = require('path');
var util = require(path.join(__dirname, './instrument.js'));
var app = express();

var execute = function() {

    app.use(connect.logger('dev'));

    app.use(util.makeInstrumentMiddleware({
        rootDir: path.join(__dirname, '../public'),
        match: function(req) {
            if (req.url.indexOf('.js') !== -1) {
                return true;
            }
            return false;
        }
    }));

    app.get('*', function(req, res, next) {
        res.send('DEFAULT! @ ' + req.url);
    });

    app.listen(9000);

};


module.exports = {
    foo: true,
    execute: execute
};
