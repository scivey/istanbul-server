'use strict';
var _ = require('underscore');
var Backbone = require('backbone');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Store = function() {
    this._store = {};
};

Store.fn = Store.prototype;
Store.fn.get = function(key) {
    return this._store[key];
};
Store.fn.put = function(key, val) {
    this._store[key] = val;
};
Store.fn.has = function(key) {
    return _.has(this._store, key);
};
Store.fn.del = function(key) {
    if (this.has(key)) {
        delete this._store[key];
    }
};

exports.Store = Store;

var GetCache = function() {
    EventEmitter.apply(this);
    this.store = new Store();
    this.pending = new Store();
    this.initialize.apply(this, arguments);
};

util.inherits(GetCache, EventEmitter);

GetCache.fn = GetCache.prototype;

GetCache.fn.initialize = function(){};

GetCache.fn._setPending = function(key) {
    this.pending.put(key, true);
};

GetCache.fn._unsetPending = function(key) {
    this.pending.del(key);
};

GetCache.fn._isPending = function(key) {
    return this.pending.has(key);
};

GetCache.fn._deferFromCache = function(key, callback) {
    var value = this.store.get(key);
    process.nextTick(function() {
        callback(null, value);
    });
};

GetCache.fn._emitLoadEvent = function(key, err, value) {
    this.emit('load:' + key, err, value);
    this.emit('load', key, err, value);
};

GetCache.fn._getAndCache = function(key, callback) {
    var self = this;
    this.getExternal(key, function(err, value) {
        self._unsetPending(key);
        if (!err) {
            self.store.put(key, value);
        }
        self._emitLoadEvent(key, err, value);
        if (callback) {
            callback(err, value);
        }
    });
};

GetCache.fn._ensureLoading = function(key) {
    if (!this._isPending(key)) {
        this._setPending(key);
        this._getAndCache(key);
    }
};

GetCache.fn.getExternal = function(key, callback) {
    // to be overridden
    var value = 'external_value_for_' + key;
    process.nextTick(function() {
        callback(null, value);
    });
};

GetCache.fn.get = function(key, callback) {
    if (this.store.has(key)) {
        return this._deferFromCache(key, callback);
    }
    this.once('load:' + key, callback);
    this._ensureLoading(key);
};

GetCache.extend = Backbone.Model.extend;

module.exports.GetCache = GetCache;
