'use strict';
var _ = require('underscore');
var istanbul = require('istanbul');
var fs = require('fs-extra');
var exports = {};
module.exports = exports;

exports.instrument = function(source, scriptName, callback) {
    var instrumenter = new istanbul.Instrumenter();
    instrumenter.instrument(source, scriptName, callback);
};

exports.getFilledCollector = function(coverageItems) {
    var collector = new istanbul.Collector();
    _.each(coverageItems, function(item) {
        collector.add(item);
    });
    return collector;
};

exports.getFileCoverageForItems = function(coverageItems) {
    var collector = exports.getFilledCollector(coverageItems);
    var output = {};
    _.each(collector.files(), function(file) {
        output[file] = collector.fileCoverageFor(file);
    });
    return output;
};

exports.summarizeCoverage = function(coverageItems, callback) {
    var coverage = exports.getFileCoverageForItems(coverageItems);
    var summarized = {};
    var summarizeFile = istanbul.utils.summarizeFileCoverage;
    _.each(coverage, function(coverage, fileName) {
        summarized[fileName] = summarizeFile(coverage);
    });
    _.defer(callback, null, summarized);
};

exports.loadInstrumentedFile = function(filePath, scriptName, callback) {
    fs.readFile(filePath, 'utf8', function(err, res) {
        if (err) {
            return callback(err);
        }
        exports.instrument(res, scriptName, callback);
    });
};
