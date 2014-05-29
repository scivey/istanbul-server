'use strict';
/*global module:false*/

module.exports = function(grunt) {

    require('matchdep').filterDev('grunt-*').forEach(function(task) {
        grunt.loadNpmTasks(task);
    });

    // Project configuration.
    grunt.initConfig({

        // Task configuration.
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                indent: 4,
                strict: true,
                unused: true,
                boss: true,
                quotmark: 'single',
                eqnull: true,
                node: true,
                globals: {}
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            test: {
                src: ['test/**/*.js'],
                options: {
                    globals: {
                        describe: true,
                        it: true,
                        before: true,
                        beforeEach: true,
                        afterEach: true,
                        after: true
                    }
                },
            },
            lib: {
                src: ['./index.js', 'lib/**/*.js']
            },
        }
    });
    grunt.registerTask('default', ['jshint']);
};
