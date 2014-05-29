'use strict';
var chai = require('chai');
var assert = chai.assert;
var path = require('path');
var _ = require('underscore');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../lib', arguments], shallow);
    return path.join.apply(null, args);
};

var server = require(inSrc('server'));

describe('server', function() {
    it('works', function() {
        assert.ok(server);
    });
});