var sinon = require('sinon');
var chai = require('chai');
var assert = chai.assert;
var path = require('path');
var _ = require('underscore');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../src', arguments], shallow);
    return path.join.apply(null, args);
};

//var main = require(inSrc('main.js'));

describe('something', function() {
    it('works', function() {
        assert.ok(true);
    });
});