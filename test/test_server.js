'use strict';
var chai = require('chai');
var assert = chai.assert;
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');
var instrument = require ('../lib/instrument');
var middlewareLib = require('../lib/middleware');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var server = require(inSrc('server'));

describe('server', function() {   
    var stub;
    beforeEach(function() {
        var stubs = this._stubs = [];
        stub = function(ref, method) {
            var aStub = sinon.stub(ref, method);
            stubs.push(aStub);
            return aStub;
        };
    });
    afterEach(function() {
        _.each(this._stubs, function(aStub) {
            aStub.restore();
        });
    });
    describe('defaults:match', function() {
        it('works', function() {
            var goodReq = {
                url: 'something/script.js'
            };
            assert.isTrue(server.defaults.match(goodReq));

            var badReq = {
                url: 'something/foo.css'
            };
            assert.isFalse(server.defaults.match(badReq));
        });
    });
    it('works', function() {
        assert.ok(server);
    });
    describe('#create', function() {
        var express, connect, mockApp, jsonMiddleware;
        var makeInstrumentMiddleware, instrumentMiddleware;
        var summarizeCoverage;
        beforeEach(function() {
            express = stub(server, '_express');
            connect = stub(server, '_connect');
            makeInstrumentMiddleware = stub(middlewareLib, 'makeInstrumentMiddleware');
            summarizeCoverage = stub(instrument, 'summarizeCoverage');
            mockApp = {
                use: sinon.stub(),
                post: sinon.stub()
            };
            jsonMiddleware = {
                jsonMiddleware: true
            };
            connect.json = sinon.stub()
                .returns(jsonMiddleware);
            express.returns(mockApp);
            instrumentMiddleware = {
                insta: true
            };
            makeInstrumentMiddleware.returns(instrumentMiddleware);
        });
        it('returns an express app.', function() {
            var app = server.create({
                rootDir: '/some/dir'
            });
            assert.equal(app, mockApp);
            sinon.assert.calledWith(app.use, jsonMiddleware);
        });
        describe('#useIstanbul', function() {
            it('installs instrumentation middleware', function() {
                var app = server.create({
                    rootDir: '/some/dir'
                });
                assert.equal(app, mockApp);
                sinon.assert.notCalled(app.post);
                sinon.assert.calledWith(app.use, jsonMiddleware);
                sinon.assert.calledOnce(app.use); 
                app.useIstanbul();
                sinon.assert.calledWith(app.use, instrumentMiddleware);
                sinon.assert.calledWithMatch(makeInstrumentMiddleware, {
                    rootDir: '/some/dir'
                });
            });
            it('accepts an optional `match` function which overrides the default', function() {
                var match = function() {};
                var app = server.create({
                    rootDir: '/some/dir',
                    match: match
                });
                assert.equal(app, mockApp);
                sinon.assert.notCalled(app.post);
                sinon.assert.calledWith(app.use, jsonMiddleware);
                sinon.assert.calledOnce(app.use); 
                app.useIstanbul();
                sinon.assert.calledWith(app.use, instrumentMiddleware);
                sinon.assert.calledWithMatch(makeInstrumentMiddleware, {
                    rootDir: '/some/dir',
                    match: match
                });
            });
            describe('POST /api/summarize route', function() {
                var req, res, summary, makeSummarizeMiddleware;
                beforeEach(function() {
                    makeSummarizeMiddleware = stub(middlewareLib, 'makeSummarizeMiddleware');
                    req = {
                        body: 'foo'
                    };
                    res = {
                        status: sinon.stub(),
                        send: sinon.stub()
                    };
                    summary = {
                        summary: true
                    };
                });
                it('uses the function returned by #makeSummarizeMiddleware', function() {
                    var summarizeMiddleware = sinon.stub();
                    makeSummarizeMiddleware.returns(summarizeMiddleware);
                    var app = server.create({
                        rootDir: '/some/dir'
                    });
                    sinon.assert.notCalled(makeSummarizeMiddleware);
                    app.useIstanbul();
                    sinon.assert.called(makeSummarizeMiddleware);
                    sinon.assert.calledWith(app.post, '/api/summarize', summarizeMiddleware);
                });
            });

        });
    });
});