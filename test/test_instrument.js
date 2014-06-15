'use strict';
var path = require('path');
var _ = require('underscore');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var fs = require('fs-extra');
var instrumentLib = require(inSrc('instrument.js'));
console.warn(_.keys(instrumentLib));
var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');
var istanbul = require('istanbul');

describe('instrumentLib', function() {
    var stub;
    beforeEach(function() {
        var stubs = [];
        this._stubs = stubs;
        stub = function() {
            var aStub = sinon.stub.apply(null, _.toArray(arguments));
            stubs.push(aStub);
            return aStub;
        };
    });
    afterEach(function() {
        _.each(this._stubs, function(aStub) {
            aStub.restore();
        });
    });

    describe('instrument', function() {
        var istanbulInstrument;
        beforeEach(function() {
            istanbulInstrument = stub(istanbul.Instrumenter.prototype, 'instrument');
        });
        it('works', function(done) {
            istanbulInstrument.callsArgWith(2, null, 'instrumentedCode');
            var code = 'var x = 5; x++; console.log(x);';
            var scriptName = '/js/foo.js';
            instrumentLib.instrument(code, scriptName, function(err, res) {
                sinon.assert.calledWithMatch(istanbulInstrument, code, scriptName, sinon.match.func);
                assert.isNull(err);
                assert.equal(res, 'instrumentedCode');
                done();
            });            
        });
    });
    describe('loadInstrumentedFile', function() {
        var readFile, instrument;
        beforeEach(function() {
            readFile = stub(fs, 'readFile');
            instrument = stub(instrumentLib, 'instrument');
        });
        it('does not call #instrument on fs error', function(done) {
            var err = {err: true};
            readFile.callsArgWith(2, err, null);
            var scriptPath = '/dir/js/foo.js';
            var scriptName = '/js/foo.js';
            instrumentLib.loadInstrumentedFile(scriptPath, scriptName, function(e, res) {
                assert.equal(e, err);
                assert.notOk(res);
                sinon.assert.notCalled(instrument);
                done();
            });
        });
        it('instruments on successful fs#read', function(done) {
            readFile.callsArgWith(2, null, 'something');
            instrument.callsArgWith(2, null, 'instrumented code');
            var scriptPath = '/dir/js/foo.js';
            var scriptName = '/js/foo.js';
            instrumentLib.loadInstrumentedFile(scriptPath, scriptName, function(err, res) {
                assert.equal(res, 'instrumented code');
                sinon.assert.calledWithMatch(instrument, 'something', scriptName, sinon.match.func);
                done();
            });
        });
    });

    describe('getFilledCollector', function() {
        var Collector;
        beforeEach(function() {
            Collector = stub(istanbul, 'Collector');
        });
        it('works', function() {
            var mockCollector = {
                add: sinon.stub()
            };
            var mockData = [5, 7];
            Collector.returns(mockCollector);
            var collector = instrumentLib.getFilledCollector(mockData);
            assert.equal(mockCollector, collector);
            assert.equal(mockCollector.add.callCount, 2);
        });
    });
    describe('getFileCoverageForItems', function() {
        var getFilledCollector;
        beforeEach(function() {
            getFilledCollector = stub(instrumentLib, 'getFilledCollector');
        });
        it('works', function() {
            var mockCollector = {
                files: sinon.stub(),
                fileCoverageFor: sinon.stub()
            };
            var mockData = [5, 7];
            getFilledCollector.returns(mockCollector);
            mockCollector.files.returns(['foo', 'bar']);
            mockCollector.fileCoverageFor
                .withArgs('foo').returns('foo-coverage')
                .withArgs('bar').returns('bar-coverage');
            var coverage = instrumentLib.getFileCoverageForItems(mockData);
            assert.ok(getFilledCollector.calledWith(mockData));
            assert.deepEqual(coverage, {
                foo: 'foo-coverage',
                bar: 'bar-coverage'
            });
        });
    });
    describe('summarizeCoverage', function() {
        var getFileCoverageForItems, summarizeFile;
        beforeEach(function() {
            getFileCoverageForItems = stub(instrumentLib, 'getFileCoverageForItems');
            summarizeFile = stub(istanbul.utils, 'summarizeFileCoverage');
        });
        it('works', function(done) {
            var fileCoverage = {
                foo: 'fooCover',
                bar: 'barCover'
            };
            getFileCoverageForItems.returns(fileCoverage);
            summarizeFile
                .withArgs('fooCover').returns('foo-summarized')
                .withArgs('barCover').returns('bar-summarized');
            instrumentLib.summarizeCoverage(fileCoverage, function(err, summarized) {
                assert.deepEqual(summarized, {
                    foo: 'foo-summarized',
                    bar: 'bar-summarized'
                });
                done();
            });
        });
    });
});
