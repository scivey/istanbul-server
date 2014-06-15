'use strict';
var instrument = require('./instrument');
var watch = require('node-watch');
var util = require('util');
var _ = require('underscore');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var cacheModule = require('./getCache.js');
exports._watch = watch;

var WatchEmitter = function(targetPath) {
    var self = this;
    exports._watch(targetPath, function(changed) {
        self.emit('change', changed);
    });
};
util.inherits(WatchEmitter, EventEmitter);
exports.WatchEmitter = WatchEmitter;


var IstanbulCache = cacheModule.GetCache.extend({
    mapToFs: function(key) {
        return path.join(this.options.rootDir, key);
    },
    getExternal: function(key, callback) {
        var file = this.mapToFs(key);
        var scriptName = key;
        instrument.loadInstrumentedFile(file, scriptName, callback);
    },
    listenToWatcher: function(watcher) {
        var self = this;
        watcher.on('change', function(changed) {
            self.store.del(changed);
        });
    },
    initialize: function(options) {
        this.options = _.extend({
            rootDir: '',
            sourceDir: ''
        }, options);
        this.watcher = new WatchEmitter(this.options.sourceDir);
        this.listenToWatcher(this.watcher);
    }
});

exports.IstanbulCache = IstanbulCache;
