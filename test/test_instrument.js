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
            istanbulInstrument.callsArgWith(1, null, 'instrumentedCode');
            var code = 'var x = 5; x++; console.log(x);';
            instrumentLib.instrument(code, function(err, res) {
                assert.ok(istanbulInstrument.called);
                assert.isNull(err);
                assert.equal(res, 'instrumentedCode');
                done();
            });
            assert.ok(istanbulInstrument.called);
        });
    });
    describe('loadInstrumentedFile', function() {
        var readFile, instrument;
        beforeEach(function() {
            readFile = stub(fs, 'readFile');
            instrument = stub(instrumentLib, 'instrument');
        });
        it('works', function(done) {
            readFile.callsArgWith(2, null, 'something');
            instrument.callsArgWith(1, null, 'instrumented code');
            instrumentLib.loadInstrumentedFile('foo.js', function(err, res) {
                assert.equal(res, 'instrumented code');
                done();
            });
        });
    });
    describe('makeInstrumentMiddleware', function() {
        var loadInstrumentedFile;
        beforeEach(function() {
            loadInstrumentedFile = stub(instrumentLib, 'loadInstrumentedFile');
        });
        it('works', function() {
            loadInstrumentedFile.callsArgWith(1, null, 'instrumented code');
            var match = sinon.stub();
            var middleware = instrumentLib.makeInstrumentMiddleware({
                rootDir: '/some/dir',
                match: match
            });
            var res = {
                send: sinon.stub()
            };
            var next = sinon.stub();
            var req = {
                url: 'js/someScript.js'
            };
            match.onCall(0).returns(false)
                .onCall(1).returns(true);
            middleware(req, res, next);
            assert.notOk(res.send.called);
            assert.ok(next.called);

            middleware(req, res, next);
            assert.ok(res.send.called);
            assert.ok(next.calledOnce);
            sinon.assert.calledWith(loadInstrumentedFile, '/some/dir/js/someScript.js');
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
