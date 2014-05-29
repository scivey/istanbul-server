var instrument = require('./instrument');
var watch = require('node-watch');
var _ = require('underscore');
var util = require('util');


// exports.resolveFile = function(fileName, callback) {
//     instrument.loadInstrumentedFile(target, function(err, instrumented) {
//         res.send(instrumented);
//     });
// };

// exports.makeInstrumentMiddleware = function(params) {
//     var rootDir = params.rootDir;
//     var match = params.match;
//     return function(req, res, next) {
//         if (match(req)) {
//             var target = path.join(rootDir, req.url);
//             exports.resolveFile(target, function(err, instrumented) {
//                 res.send(instrumented);
//             });
//         } else {
//             next();
//         }
//     };
// };
