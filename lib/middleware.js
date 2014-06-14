'use strict';
var instrumentLib = require('./instrument');
var path = require('path');

var exports = {};
module.exports = exports;

exports.determineResponse = function(res, err, instrumentedSrc) {
    if (err) {
        res.statusCode(500);
        return res.send(err);
    }
    res.statusCode(200);
    res.send(instrumentedSrc);
};

exports.matchOrNext = function(match, req, next) {
    if (match(req)) {
        return true;
    } else {
        next();
        return false;
    }
};

exports.joiner = function(firstPart) {
    return function(secondPart) {
        return path.join(firstPart, secondPart);
    };
};

exports.makeInstrumentMiddleware = function(params) {
    var rootDir = params.rootDir;
    var inRootDir = exports.joiner(rootDir);
    var match = params.match;
    return function(req, res, next) {
        if (exports.matchOrNext(match, req, next)) {
            var target = inRootDir(req.url);
            instrumentLib.loadInstrumentedFile(target, function(err, instrumented) {
                exports.determineResponse(res, err, instrumented);
            });
        }
    };
};
