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

var cacheModule = require(inLib('getCache'));

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
            store.put('bar', 12);
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
    describe('#getExternal', function() {
        it('is a stub for external resource fetch', function(done) {
            cache.getExternal('foo', function(err, res) {
                assert.isNull(err);
                assert.equal(res, 'external_value_for_foo');
                done();
            });
        });
    });
    describe('#_deferFromCache', function() {
        it('returns from the store on nextTick', function(done) {
            cache.store.get = sinon.stub()
                .withArgs('foo').returns('foo_value');

            cache._deferFromCache('foo', function(err, res) {
                assert.isNull(err);
                assert.equal(res, 'foo_value');
                done();
            });
        });
    });
    describe('#_getAndCache', function() {
        beforeEach(function() {
            cache.getExternal = sinon.stub();
            cache._unsetPending = sinon.stub();
            cache.store.put = sinon.stub();
            cache._emitLoadEvent = sinon.stub();
        });
        it('calls #getExternal; caches and returns the result', function(done) {
            cache.getExternal.callsArgWith(1, null, 'foo_value');
            cache._getAndCache('foo', function(err, res) {
                assert.isNull(err);
                assert.equal(res, 'foo_value');
                sinon.assert.calledWith(cache.store.put, 'foo', 'foo_value');
                sinon.assert.calledWith(cache._unsetPending, 'foo');
                sinon.assert.calledWith(cache.getExternal, 'foo');
                sinon.assert.calledWith(cache._emitLoadEvent, 'foo', null, 'foo_value');
                done();
            });
        });
        it('does not cache if #getExternal returns an error.', function(done) {
            cache.getExternal.callsArgWith(1, 'an error');
            cache._getAndCache('foo', function(err, res) {
                assert.equal(err, 'an error');
                assert.isUndefined(res);
                sinon.assert.notCalled(cache.store.put);
                sinon.assert.calledWith(cache._unsetPending, 'foo');
                sinon.assert.calledWith(cache.getExternal, 'foo');
                sinon.assert.calledWithExactly(cache._emitLoadEvent, 'foo', 'an error', undefined);
                done();
            });
        });
    });
    describe('#emitLoadEvent', function() {
        it('emits `loaded:[key]` and `loaded` events', function() {
            cache.emit = sinon.stub();
            cache._emitLoadEvent('foo', null, 'foo_result');
            sinon.assert.calledTwice(cache.emit);
            sinon.assert.calledWith(cache.emit, 'load:foo', null, 'foo_result');
            sinon.assert.calledWith(cache.emit, 'load', 'foo', null, 'foo_result');
        });
        it('does the same for an error.', function() {
            cache.emit = sinon.stub();
            cache._emitLoadEvent('foo', 'foo_related_err');
            sinon.assert.calledTwice(cache.emit);
            sinon.assert.calledWithExactly(cache.emit, 'load:foo', 'foo_related_err', undefined);
            sinon.assert.calledWithExactly(cache.emit, 'load', 'foo', 'foo_related_err', undefined);
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

});