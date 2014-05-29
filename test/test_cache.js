'use strict';
var chai = require('chai');
var fs = require('fs');
var sinon = require('sinon');
var assert = chai.assert;
var path = require('path');
var _ = require('underscore');

var inLib = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var cacheModule = require(inLib('cache'));

describe('WatchEmitter', function() {
    var originalWatch;
    var WatchEmitter = cacheModule.WatchEmitter;
    beforeEach(function() {
        originalWatch = cacheModule._watch;
        sinon.stub(cacheModule, '_watch');
    });
    afterEach(function() {
        cacheModule._watch.restore();
    });
    it('uses `watch`', function() {
        assert.equal(originalWatch, require('node-watch'));
    });
    it('triggers events from `watch` callbacks.', function(done) {
        var emitter = new WatchEmitter('/some/directory');
        var watchCall = cacheModule._watch.getCall(0).args;
        assert.equal(watchCall[0], '/some/directory');
        var watchCallback = watchCall[1];
        emitter.on('change', function(changed) {
            assert.equal('changed_file', changed);
            done();    
        });
        watchCallback('changed_file');
    });
});

describe('Store', function() {
    var Store = cacheModule.Store;
    var store;
    beforeEach(function() {
        store = new Store();
    });
    it('constructs', function() {
        assert.instanceOf(store, Store);
        assert.deepEqual({}, store._store);
    });
    describe('#get', function() {
        it('works', function() {
            store._store = {
                foo: 1,
                bar: 2
            };
            assert.equal(1, store.get('foo'));
            assert.equal(2, store.get('bar'));
        });
    });
    describe('#put', function() {
        it('works', function() {
            store._store = {};
            store.put('foo', 11);
            assert.deepEqual({
                foo: 11
            }, store._store);
            store.put('bar', 12)
            assert.deepEqual({
                foo: 11,
                bar: 12
            }, store._store);
        });
    });
    describe('#has', function() {
        var _has;
        before(function() {
            _has = sinon.stub(_, 'has');
        });
        after(function() {
            _has.restore();
        });
        it('works', function() {
            _has.withArgs(store._store, 'foo').returns(true)
                .withArgs(store._store, 'bar').returns(false);
            assert.isTrue(store.has('foo'));
            assert.isFalse(store.has('bar'));
        });
    });
    describe('#del', function() {
        it('deletes if #has returns true', function() {
            store._store = {
                foo: 1,
                bar: 2,
                car: 3
            };
            store.has = sinon.stub()
                .withArgs('bar').returns(true);
            store.del('bar');
            assert.deepEqual({
                foo: 1,
                car: 3
            }, store._store);
        });
        it('does not delete if #has returns false', function() {
            store._store = {
                foo: 1,
                bar: 2,
                car: 3
            };
            store.has = sinon.stub()
                .withArgs('bar').returns(false);
            store.del('bar');
            assert.deepEqual({
                foo: 1,
                bar: 2,
                car: 3
            }, store._store);
        });
    });
});

describe('GetCache', function() {
    var GetCache = cacheModule.GetCache;
    var cache;
    beforeEach(function() {
        cache = new GetCache();
    });
    it('constructs', function() {
        assert.instanceOf(cache, GetCache);
        assert.instanceOf(cache.store, cacheModule.Store);
        assert.instanceOf(cache.pending, cacheModule.Store);
    });
    describe('#_setPending', function() {
        it('works', function() {
            cache.pending.put = sinon.stub();
            cache._setPending('foo');
            sinon.assert.calledWith(cache.pending.put, 'foo', true);
        });
    });
    describe('#_unsetPending', function() {
        it('works', function() {
            cache.pending.del = sinon.stub();
            cache._unsetPending('foo');
            sinon.assert.calledWith(cache.pending.del, 'foo');
        });
    });
    describe('#_isPending', function() {
        it('works', function() {
            cache.pending.has = sinon.stub()
                .withArgs('foo').returns(true);
            assert.isTrue(cache._isPending('foo'));
            sinon.assert.calledWith(cache.pending.has, 'foo');
        });
    });
    describe('#_ensureLoading', function() {
        it('if load already pending, has no effect', function() {
            cache._isPending = sinon.stub()
                .withArgs('foo').returns(true);
            cache._setPending = sinon.stub();
            cache._getAndCache = sinon.stub();
            cache._ensureLoading('foo');
            sinon.assert.calledWith(cache._isPending, 'foo');
            sinon.assert.notCalled(cache._getAndCache);
            sinon.assert.notCalled(cache._setPending);
        });
        it('if load not pending, sets pending state and calls for load.', function() {
            cache._isPending = sinon.stub()
                .withArgs('foo').returns(false);
            cache._setPending = sinon.stub();
            cache._getAndCache = sinon.stub();
            cache._ensureLoading('foo');
            sinon.assert.calledWith(cache._isPending, 'foo');
            sinon.assert.calledWith(cache._getAndCache, 'foo');
            sinon.assert.calledWith(cache._setPending, 'foo');
        });
    });
    describe('#get', function() {
        it('if key is in store, calls for async return from cache.', function() {
            cache.store.has = sinon.stub()
                .withArgs('foo').returns(true);
            cache._deferFromCache = sinon.stub();
            cache.once = sinon.stub();
            cache._ensureLoading = sinon.stub();
            var callback = sinon.stub();
            cache.get('foo', callback);
            sinon.assert.calledWith(cache.store.has, 'foo');
            sinon.assert.calledWith(cache._deferFromCache, 'foo', callback);
            sinon.assert.notCalled(cache.once);
            sinon.assert.notCalled(cache._ensureLoading);
        });
        it('if key not in store, adds one-time listener for load:[key] event and triggers loading. ', function() {
            cache.store.has = sinon.stub()
                .withArgs('foo').returns(false);
            cache._deferFromCache = sinon.stub();
            cache.once = sinon.stub();
            cache._ensureLoading = sinon.stub();
            var callback = sinon.stub();
            cache.get('foo', callback);
            sinon.assert.calledWith(cache.store.has, 'foo');
            sinon.assert.notCalled(cache._deferFromCache);
            sinon.assert.called(cache.once, 'load:foo', callback);
            sinon.assert.called(cache._ensureLoading, 'foo');
        });
    });


// GetCache.fn = GetCache.prototype;

// GetCache.fn._setPending = function(key) {
//     this.pendin.put(key, true);
// };

// GetCache.fn._unsetPending = function(key) {
//     this.pending.del(key);
// };

// GetCache.fn._isPending = function(key) {
//     return this.pending.has(key);
// };

// GetCache.fn._deferFromCache = function(key, callback) {
//     var value = this.store.get(key);
//     process.nextTick(function() {
//         callback(null, value);
//     });
// };

// GetCache.fn._emitLoadEvent = function(key, err, value) {
//     this.emit('load:' + key, err, value);
//     this.emit('load', key, err, value);
// };

// GetCache.fn._getAndCache = function(key, callback) {
//     var self = this;
//     this.getExternal(key, function(err, value) {
//         self._unsetPending(key);
//         if (!err) {
//             self.store.put(key, value);
//         }
//         self._emitLoadEvent(key, err, value);
//     });
// };

// GetCache.fn._ensureLoading = function(key) {
//     if (!this.isPending(key)) {
//         this.setPending(key);
//         this._getAndCache(key);
//     }
// };

// GetCache.fn.getExternal = function(key, callback) {
//     // to be overridden
//     var value = 'external_value_for_' + key;
//     process.nextTick(function() {
//         callback(null, value);
//     });
// };

// GetCache.fn.get = function(key, callback) {
//     if (this.store.has(key)) {
//         return this._deferFromCache(key, callback);
//     }
//     this.once('load:' + key, callback);
//     this.ensureLoading(key);
// };

});