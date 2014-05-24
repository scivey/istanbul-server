var path = require('path');
var _ = require('underscore');

var inSrc = function() {
    var shallow = true;
    var args = _.flatten([__dirname, '../src', arguments], shallow);
    return path.join.apply(null, args);
};

var util = require(inSrc('util.js'));
var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');
var istanbul = require('istanbul');

describe('util', function() {
    describe('instrument', function() {
        var istanbulInstrument;
        before(function() {
            istanbulInstrument = sinon.stub(istanbul.Instrumenter.prototype, 'instrument');
        });
        it('works', function(done) {
            istanbulInstrument.callsArgWith(1, 'instrumentedCode');
            var code = 'var x = 5; x++; console.log(x);';
            util.instrument(code, function(err, res) {
                assert.ok(istanbulInstrument.called);
                done();
            });
            _.defer(function() {
                assert.ok(istanbulInstrument.called);
            })
        });
        after(function() {
            istanbulInstrument.restore();
        });
    });
});
