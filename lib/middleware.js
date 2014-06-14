'use strict';
var instrumentLib = require('./instrument');
var path = require('path');
var istanbulCache = require('./istanbulCache');

var exports = {};
module.exports = exports;

exports.determineInstrumentResponse = function(res, err, instrumentedSrc) {
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

exports.NonCachedInstrumenter = function(rootDir) {
    this.inRootDir = exports.joiner(rootDir);
};

exports.NonCachedInstrumenter.prototype.get = function(target, callback) {
    target = this.inRootDir(target);
    instrumentLib.loadInstrumentedFile(target, callback);
};


exports.getInstrumenter = function(shouldCache, rootDir, sourceDir) {
    var instrumenter;
    if (shouldCache) {
        instrumenter = new istanbulCache.IstanbulCache({
            rootDir: rootDir,
            sourceDir: sourceDir
        });
    } else {
        instrumenter = new exports.NonCachedInstrumenter(rootDir);
    }
    return instrumenter;
};

exports.makeInstrumentMiddleware = function(params) {
    var rootDir = params.rootDir;
    var sourceDir = params.sourceDir || rootDir;
    var shouldCache = params.cache;
    var instrumenter = exports.getInstrumenter(shouldCache, rootDir, sourceDir);
    var match = params.match;
    return function(req, res, next) {
        if (exports.matchOrNext(match, req, next)) {
            instrumenter.get(req.url, function(err, instrumented) {
                exports.determineInstrumentResponse(res, err, instrumented);
            });
        }
    };
};


exports.determineSummarizeResponse = function(res, err, summary) {
    if (err) {
        res.statusCode(400);
        res.send(err);
    } else {
        res.statusCode(200);
        res.send(summary);
    }    
};

exports.makeSummarizeMiddleware = function() {
    return function(req, res) {
        instrumentLib.summarizeCoverage([req.body], function(err, summary) {
            exports.determineSummarizeResponse(res, err, summary);
        });
    };
};
