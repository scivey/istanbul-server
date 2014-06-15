'use strict';
var path = require('path');
var _ = require('underscore');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var istanbulCache = require('../lib/istanbulCache');

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
                status: sinon.stub(),
                send: sinon.stub()
            };
            instrumented = {instrumented: true};
        });
        it('returns 500 and the error if errors are found.', function() {
            var err = {err: true};
            middlewareLib.determineInstrumentResponse(res, err, instrumented);
            sinon.assert.calledWith(res.status, 500);
            sinon.assert.calledWith(res.send, err);
        });
        it('returns 200 and the source if no error returned.', function() {
            var err = null;
            middlewareLib.determineInstrumentResponse(res, err, instrumented);
            sinon.assert.calledWith(res.status, 200);
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
    describe('NonCachedInstrumenter', function() {
        var stubs, joinFunc;
        beforeEach(function() {
            stubs = {};
            stubs.loadInstrumentedFile = stub(instrumentLib, 'loadInstrumentedFile');
            stubs.joiner = stub(middlewareLib, 'joiner');
            joinFunc = sinon.stub();
            stubs.joiner
                .withArgs('/root/dir').returns(joinFunc);
        });
        describe('construction', function() {
            it('works', function() {
                var rootDir = '/root/dir';
                var instrumenter = new middlewareLib.NonCachedInstrumenter(rootDir);
                assert.equal(instrumenter.inRootDir, joinFunc);
            });
        });
        describe('#get', function() {
            it('works', function() {
                var rootDir = '/root/dir';
                joinFunc.withArgs('foo.js').returns('mapped_path.js');
                var instrumenter = new middlewareLib.NonCachedInstrumenter(rootDir);
                assert.equal(instrumenter.inRootDir, joinFunc);
                var err = {err: true};
                var instrumented = {instrumented: true};
                stubs.loadInstrumentedFile.callsArgWith(2, err, instrumented);
                instrumenter.get('foo.js', function(e, i) {
                    assert.equal(e, err);
                    assert.equal(i, instrumented);
                    sinon.assert.calledWithMatch(stubs.loadInstrumentedFile, 'mapped_path.js', 'foo.js', sinon.match.func);
                });
            });
        });
    });
    describe('#getInstrumenter', function() {
        beforeEach(function() {

            // prevent the fs-watch from starting
            stub(istanbulCache.IstanbulCache.prototype, 'initialize');
        });
        it('returns an IstanbulCache if `shouldCache` is true.', function() {
            var shouldCache = true;
            var rootDir = '/root/dir';
            var srcDir = 'src';
            var instrumenter = middlewareLib.getInstrumenter(shouldCache, rootDir, srcDir);
            assert.instanceOf(instrumenter, istanbulCache.IstanbulCache);
        });
        it('returns a NonCachedInstrumenter if `shouldCache` is false.', function() {
            var shouldCache = false;
            var rootDir = '/root/dir';
            var srcDir = 'src';
            var instrumenter = middlewareLib.getInstrumenter(shouldCache, rootDir, srcDir);
            assert.instanceOf(instrumenter, middlewareLib.NonCachedInstrumenter);
        });
    });
    describe('makeInstrumentMiddleware', function() {
        var stubs, match;
        var req, res, next;
        beforeEach(function() {
            stubs = {};
            _.each(['matchOrNext', 'determineInstrumentResponse', 'getInstrumenter'], function(method) {
                stubs[method] = stub(middlewareLib, method);
            });
            match = sinon.stub();
            res = {
                send: sinon.stub(),
                status: sinon.stub()
            };
            next = sinon.stub();
            req = {
                url: 'js/someScript.js'
            };
        });
        it('calls #getInstrumenter to get its instrumenting function', function() {
            var rootDir = '/some/dir';
            var sourceDir = '/some/dir/src';
            var cache = true;
            var params = {
                rootDir: rootDir,
                sourceDir: sourceDir,
                cache: cache
            };
            var instrumenter = {
                get: sinon.stub()
            };
            stubs.getInstrumenter
                .withArgs(cache, rootDir, sourceDir).returns(instrumenter);
            var middleware = middlewareLib.makeInstrumentMiddleware(params);
            assert.isFunction(middleware);
            sinon.assert.called(stubs.getInstrumenter);
        });
        it('calls `matchOrNext` with its `match` setting and the request, and does nothing if it returns false.', function() {
            var rootDir = '/some/dir';
            var sourceDir = '/some/dir/src';
            var cache = true;
            var params = {
                rootDir: rootDir,
                sourceDir: sourceDir,
                cache: cache
            };
            var instrumenter = {
                get: sinon.stub()
            };
            stubs.getInstrumenter
                .withArgs(cache, rootDir, sourceDir).returns(instrumenter);
            var middleware = middlewareLib.makeInstrumentMiddleware(params);
            sinon.assert.called(stubs.getInstrumenter);
            stubs.matchOrNext
                .withArgs(match, req, next).returns(false);
            middleware(req, res, next);
            sinon.assert.notCalled(instrumenter.get);
        });
        it('instruments and calls callback if `matchOrNext` returns true.', function() {
            var rootDir = '/some/dir';
            var sourceDir = '/some/dir/src';
            var cache = true;
            var params = {
                rootDir: rootDir,
                sourceDir: sourceDir,
                cache: cache
            };
            var instrumenter = {
                get: sinon.stub()
            };

            var err = {err: true};
            var instrumented = {instrumented: true};
            instrumenter.get
                .callsArgWith(1, err, instrumented);

            stubs.getInstrumenter
                .withArgs(cache, rootDir, sourceDir).returns(instrumenter);

            stubs.matchOrNext.returns(true);

            var middleware = middlewareLib.makeInstrumentMiddleware(params);

            middleware(req, res, next);
            sinon.assert.calledWithMatch(instrumenter.get, req.url, sinon.match.func);
            sinon.assert.calledWith(stubs.determineInstrumentResponse, res, err, instrumented);
        });
    });
    describe('#determineSummarizeResponse', function() {
        var res, summary;
        beforeEach(function() {
            res = {
                send: sinon.stub(),
                status: sinon.stub()
            };
            summary = {summary: true};
        });
        it('works', function() {
            var err = {err: true};
            middlewareLib.determineSummarizeResponse(res, err, summary);
            sinon.assert.calledWith(res.status, 400);
            sinon.assert.calledWith(res.send, err);
        });
        it('works', function() {
            var err = null;
            middlewareLib.determineSummarizeResponse(res, err, summary);
            sinon.assert.calledWith(res.status, 200);
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
