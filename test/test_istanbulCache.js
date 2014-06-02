'use strict';
var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;
var path = require('path');
var _ = require('underscore');

var inLib = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var istanbulModule = require(inLib('istanbulCache'));
var instrument = require(inLib('instrument'));

describe('WatchEmitter', function() {
    var originalWatch;
    var WatchEmitter = istanbulModule.WatchEmitter;
    beforeEach(function() {
        originalWatch = istanbulModule._watch;
        sinon.stub(istanbulModule, '_watch');
    });
    afterEach(function() {
        istanbulModule._watch.restore();
    });
    it('uses `watch`', function() {
        assert.equal(originalWatch, require('node-watch'));
    });
    it('triggers events from `watch` callbacks.', function(done) {
        var emitter = new WatchEmitter('/some/directory');
        var watchCall = istanbulModule._watch.getCall(0).args;
        assert.equal(watchCall[0], '/some/directory');
        var watchCallback = watchCall[1];
        emitter.on('change', function(changed) {
            assert.equal('changed_file', changed);
            done();    
        });
        watchCallback('changed_file');
    });
});

describe('IstanbulCache', function() {
    var IstanbulCache = istanbulModule.IstanbulCache;
    var stub;
    beforeEach(function() {
        var stubs = this._stubs = [];
        stub = function(target, property) {
            var aStub = sinon.stub(target, property);
            stubs.push(aStub);
            return aStub;
        };
    });
    afterEach(function() {
        _.each(this._stubs, function(aStub) {
            aStub.restore();
        });
    });
    describe('#initialize', function() {
        var originalInit, stubInit;
        beforeEach(function() {
            originalInit = IstanbulCache.prototype.initialize;
            stubInit = stub(IstanbulCache.prototype, 'initialize');
        });
        it('works', function() {
            var cache = new IstanbulCache();
            assert.notOk(cache.watcher);
            assert.notOk(cache.options);
            cache.listenToWatcher = sinon.stub();
            var opts = {opts: true};
            originalInit.apply(cache, [opts]);
            assert.instanceOf(cache.watcher, istanbulModule.WatchEmitter);
            sinon.assert.calledWith(cache.listenToWatcher, cache.watcher);
            assert.deepEqual({
                rootDir: '',
                sourceDir: '',
                opts: true
            }, cache.options);
        });
    });
    describe('#mapToFs', function() {
        var pathJoin;
        beforeEach(function() {
            pathJoin = stub(path, 'join');
        });
        it('works', function() {
            var rootDir = 'the_root';
            var cache = new IstanbulCache({
                sourceDir: 'foobar',
                rootDir: rootDir
            });
            pathJoin.withArgs(rootDir, 'a_file').returns('joined');
            assert.equal(cache.mapToFs('a_file'), 'joined');
        });
    });
    describe('#getExternal', function() {
        var loadInstrumentedFile;
        beforeEach(function() {
            loadInstrumentedFile = stub(instrument, 'loadInstrumentedFile');
        });
        it('works', function() {
            var cache = new IstanbulCache({
                sourceDir: 'sourceDir',
                rootDir: 'rootDir'
            });
            cache.mapToFs = sinon.stub()
                .withArgs('external_resource').returns('mapped_resource');

            var aCallback = {callback: true};
            cache.getExternal('external_resource', aCallback);
            sinon.assert.calledWith(loadInstrumentedFile, 'mapped_resource', aCallback);
        });
    });
    describe('#listenToWatcher', function() {
        it('works', function() {
            var cache = new IstanbulCache({
                sourceDir: 'sourceDir',
                rootDir: 'rootDir'
            });
            cache.store.del = sinon.stub();
            var watcher = {
                on: sinon.stub()
                    .callsArgWith(1, 'changed_file')
            };
            cache.listenToWatcher(watcher);
            sinon.assert.calledWith(watcher.on, 'change');
            sinon.assert.calledWith(cache.store.del, 'changed_file');
        });
    });
});
