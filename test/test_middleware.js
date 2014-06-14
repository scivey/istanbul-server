'use strict';
var path = require('path');
var _ = require('underscore');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var instrumentLib = require(inSrc('instrument.js'));
var middlewareLib = require('../lib/middleware');
var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('middleware', function() {
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
    describe('#determineInstrumentResponse', function() {
        var res, instrumented;
        beforeEach(function() {
            res = {
                statusCode: sinon.stub(),
                send: sinon.stub()
            };
            instrumented = {instrumented: true};
        });
        it('returns 500 and the error if errors are found.', function() {
            var err = {err: true};
            middlewareLib.determineInstrumentResponse(res, err, instrumented);
            sinon.assert.calledWith(res.statusCode, 500);
            sinon.assert.calledWith(res.send, err);
        });
        it('returns 200 and the source if no error returned.', function() {
            var err = null;
            middlewareLib.determineInstrumentResponse(res, err, instrumented);
            sinon.assert.calledWith(res.statusCode, 200);
            sinon.assert.calledWith(res.send, instrumented);
        });
    });
    describe('#matchOrNext', function() {
        var req, next, match;
        beforeEach(function() {
            req = {req: true};
            next = sinon.stub();
            match = sinon.stub();
        });
        it('works', function() {
            match.withArgs(req).returns(true);
            var result = middlewareLib.matchOrNext(match, req, next);
            assert.isTrue(result);
            sinon.assert.notCalled(next);
        });
        it('works', function() {
            match.withArgs(req).returns(false);
            var result = middlewareLib.matchOrNext(match, req, next);
            assert.isFalse(result);
            sinon.assert.calledOnce(next);
        });
    });
    describe('#joiner', function() {
        var pathJoin;
        beforeEach(function() {
            pathJoin = stub(path, 'join');
        });
        it('works', function() {
            var firstPart = 'foo';
            var lastPart = 'bar';
            pathJoin.withArgs(firstPart, lastPart).returns('JOINED_PATH');
            var joinFunc = middlewareLib.joiner(firstPart);
            var joined = joinFunc(lastPart);
            assert.equal(joined, 'JOINED_PATH');
        });
    });
    describe('makeInstrumentMiddleware', function() {
        var stubs, match, joinFunc;
        var req, res, next;
        beforeEach(function() {
            stubs = {};
            stubs.loadInstrumentedFile = stub(instrumentLib, 'loadInstrumentedFile');
            _.each(['joiner', 'matchOrNext', 'determineInstrumentResponse'], function(method) {
                stubs[method] = stub(middlewareLib, method);
            });
            joinFunc = sinon.stub();
            stubs.joiner
                .withArgs('/some/dir').returns(joinFunc);
            match = sinon.stub();
            res = {
                send: sinon.stub(),
                statusCode: sinon.stub()
            };
            next = sinon.stub();
            req = {
                url: 'js/someScript.js'
            };
        });
        it('joins request urls with its `rootDir` setting', function() {
            var middleware = middlewareLib.makeInstrumentMiddleware({
                rootDir: '/some/dir'
            });
            assert.isFunction(middleware);
            sinon.assert.calledWith(stubs.joiner, '/some/dir');
        });
        it('calls `matchOrNext` with its `match` setting and the request, and does nothing if it returns false.', function() {
            var middleware = middlewareLib.makeInstrumentMiddleware({
                rootDir: '/some/dir',
                match: match
            });
            stubs.matchOrNext
                .withArgs(match, req, next).returns(false);
            middleware(req, res, next);
            sinon.assert.notCalled(joinFunc);
            sinon.assert.notCalled(stubs.loadInstrumentedFile);
            sinon.assert.calledWith(stubs.matchOrNext, match, req, next);
        });
        it('instruments and calls callback if `matchOrNext` returns true.', function() {
            var middleware = middlewareLib.makeInstrumentMiddleware({
                rootDir: '/some/dir',
                match: match
            });
            stubs.matchOrNext
                .withArgs(match, req, next).returns(true);
            joinFunc.withArgs(req.url).returns('requested_file.js');
            middleware(req, res, next);
            sinon.assert.calledWithMatch(stubs.loadInstrumentedFile, 'requested_file.js', sinon.match.func);
            var instrumentCallback = stubs.loadInstrumentedFile.getCall(0).args[1];
            var err = {err: true};
            var instrumented = {instrumented: true};
            instrumentCallback(err, instrumented);
            sinon.assert.calledWith(stubs.determineInstrumentResponse, res, err, instrumented);
        });
    });
    describe('#determineSummarizeResponse', function() {
        var res, summary;
        beforeEach(function() {
            res = {
                send: sinon.stub(),
                statusCode: sinon.stub()
            };
            summary = {summary: true};
        });
        it('works', function() {
            var err = {err: true};
            middlewareLib.determineSummarizeResponse(res, err, summary);
            sinon.assert.calledWith(res.statusCode, 400);
            sinon.assert.calledWith(res.send, err);
        });
        it('works', function() {
            var err = null;
            middlewareLib.determineSummarizeResponse(res, err, summary);
            sinon.assert.calledWith(res.statusCode, 200);
            sinon.assert.calledWith(res.send, summary);
        });
    });
    describe('#makeSummarizeMiddleware', function() {
        var summarizeCoverage, determineSummarizeResponse, req, res;
        beforeEach(function() {
            req = {
                body: {body: true}
            };
            res = {
                res: true
            };
            determineSummarizeResponse = stub(middlewareLib, 'determineSummarizeResponse');
            summarizeCoverage = stub(instrumentLib, 'summarizeCoverage');
        });
        it('returns a function', function() {
            var middleware = middlewareLib.makeSummarizeMiddleware();
            assert.isFunction(middleware);
        });
        it('tries to summarize the request body and then passes response to #determineSummarizeResponse', function() {
            var middleware = middlewareLib.makeSummarizeMiddleware();
            var summary = {summary: true};
            var err = {err: true};
            summarizeCoverage.callsArgWith(1, err, summary);
            middleware(req, res);
            sinon.assert.calledWithMatch(summarizeCoverage, [req.body], sinon.match.func);
            sinon.assert.calledWith(determineSummarizeResponse, res, err, summary);
        });
    });
});
