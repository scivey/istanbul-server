var _ = require('underscore');
var istanbul = require('istanbul');

var instrument = function(source, callback) {
    var instrumenter = new istanbul.Instrumenter();
    instrumenter.instrument(source, callback);
};


module.exports = {
    instrument: instrument
};
