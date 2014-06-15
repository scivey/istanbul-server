'use strict';
var chai = require('chai');
var assert = chai.assert;
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');
var request = require('request');
var async = require('async');
var connect = require('connect');
var fs = require('fs');

var server = require('../lib/server');

var getTestDataDir = function() {
    return path.join(__dirname, '../test_data');
}

var getRootDir = function() {
    return path.join(getTestDataDir(), 'public');
};

var getSourceDir = function() {
    return path.join(getRootDir(), 'js')
};

console.warn(getRootDir());



var PORTNUM = 9008;
var inServer = function(urlPart) {
    var serverPart = 'http://localhost:' + PORTNUM;
    urlPart = urlPart.indexOf('/') === 0 ? urlPart : '/' + urlPart;
    return serverPart + urlPart;
};

var get = function(url, callback) {
    request(url, function(err, res, body) {
        callback(null, [err, res, body]);
    });
};

var getMany = function(urls, callback) {
    async.map(urls, get, callback);
};

var nth = function(n) {
    return function(list) {
        return list[n];
    };
};

var contains = function(str, match) {
    return str.indexOf(match) !== -1;
};


var isInstrumented = function(src) {
    return contains(src, '__cov_');
};

var postJSON = function(url, data, callback) {
    request({
        url: url,
        method: 'POST',
        body: _.isString(data) ? data : JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        },
    }, function(err, res, body) {
        callback(null, [err, res, body]);        
    });
};


describe('Server - integration test', function() {
    var app;
    this.timeout(5000);
    before(function(done) {
        app = server.create({
            rootDir: getRootDir(),
            sourceDir: getSourceDir(),
            match: function(req) {
                return req.url.indexOf('/js/') !== -1;
            }
        });

        app.use(connect.logger('dev'));
        app.useIstanbul();
        app.use(connect.static(getRootDir()));
        app.listen(PORTNUM)
        setTimeout(function() {
            done();
        }, 1500);
    });
    describe('instrumentation', function() {
        it('instruments the files it should', function(done) {
            var files = _.map(['bar.js', 'foo.js'], function(oneFile) {
                return inServer(path.join('/js', oneFile));
            });
            getMany(files, function(err, responses) {
                var bodies = _.map(responses, nth(2));
                var barBody = bodies[0];
                assert.ok(contains(barBody, 'this is bar.js'));
                assert.ok(isInstrumented(barBody));
                var fooBody = bodies[1];
                assert.ok(contains(fooBody, 'this is foo.js'));
                assert.ok(isInstrumented(fooBody));
                done();
            });
        });
        it('handles malformed files', function(done) {
            var malformed = inServer('/js/has_syntax_error.js');
            getMany([malformed], function(err, responses) {
                var hasSyntaxError = responses[0];
                var response = hasSyntaxError[1];
                assert.equal(response.statusCode, 500);
                done();
            });
        });
        it('handles missing files', function(done) {
            var missing = inServer('/js/does_not_exist.js');
            getMany([missing], function(err, responses) {
                var doesNotExist = responses[0];
                var response = doesNotExist[1];
                assert.equal(response.statusCode, 500);
                done();
            });
        });
        it('does not instrument non-matching files', function(done) {
            var files = _.map(['some_lib.js', 'other_lib.js'], function(oneFile) {
                return inServer(path.join('/lib', oneFile));
            });
            getMany(files, function(err, responses) {
                var bodies = _.map(responses, nth(2));
                var someLibBody = bodies[0];
                assert.ok(contains(someLibBody, 'this is some_lib.js'));
                assert.notOk(isInstrumented(someLibBody));

                var otherLibBody = bodies[1];
                assert.ok(contains(otherLibBody, 'this is other_lib.js'));
                assert.notOk(isInstrumented(otherLibBody));
                done();
            });
        });
    });
    describe('coverage report', function() {        
        it('handles malformed requests', function(done) {
            postJSON(inServer('/api/summarize'), 'bad', function(err, responseData) {
                assert.equal(responseData[1].statusCode, 400);
                done();
            });
        });
        it('summarizes coverage files', function(done) {
            fs.readFile(path.join(getTestDataDir(), 'coverage_data.json'), 'utf8', function(err, res) {
                postJSON(inServer('/api/summarize'), res, function(err, responseData) {
                    var body = responseData[2];
                    body = JSON.parse(body);
                    var expected = {
                      '/js/numbers.js': {
                        'lines': {
                          'total': 5,
                          'covered': 3,
                          'skipped': 0,
                          'pct': 60
                        },
                        'statements': {
                          'total': 5,
                          'covered': 3,
                          'skipped': 0,
                          'pct': 60
                        },
                        'functions': {
                          'total': 4,
                          'covered': 2,
                          'skipped': 0,
                          'pct': 50
                        },
                        'branches': {
                          'total': 0,
                          'covered': 0,
                          'skipped': 0,
                          'pct': 100
                        }
                      },
                      '/js/strings.js': {
                        'lines': {
                          'total': 8,
                          'covered': 5,
                          'skipped': 0,
                          'pct': 62.5
                        },
                        'statements': {
                          'total': 8,
                          'covered': 5,
                          'skipped': 0,
                          'pct': 62.5
                        },
                        'functions': {
                          'total': 2,
                          'covered': 1,
                          'skipped': 0,
                          'pct': 50
                        },
                        'branches': {
                          'total': 0,
                          'covered': 0,
                          'skipped': 0,
                          'pct': 100
                        }
                      }
                    };
                    assert.deepEqual(body, expected);
                    done();
                });
            });
        });
    });
});
