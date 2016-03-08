'use strict';

var paths = {
    root: './',         // App root path
    src:  './app/',     // Source path
    dist: './dist/js/'  // Distribution path
};

var connect = require('gulp-connect');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');

gulp.task('build', function () {
    // Init browserify
    var b = browserify({
        entries: paths.src + 'app.js',
        debug: true
    });

    // Run browserify and uglify with source maps
    return b.bundle()
        .pipe(source('bundle.min.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .on('error', gutil.log)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('connect', function() {
    connect.server({
        root: paths.root
    });
});

gulp.task('watch', function() {
    gulp.watch(paths.src + '**/*.js', ['build']);
});

gulp.task('default', ['connect', 'build', 'watch']);
