'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');

var concat = require('gulp-concat');
var connect = require('gulp-connect');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var sources = ['app/js/app.js', 'app/js/**/*.js', 'app/vendor/js/rbush/module.js', 'app/vendor/js/stats-lite/module.js', 'app/vendor/js/**/*.js'];

gulp.task('build-dev', function () {
    gulp.src(sources)
        .pipe(sourcemaps.init())
        .pipe(concat('bundle.min.js'))
        .pipe(ngAnnotate()).on('error', gutil.log) // In case of parse error, comment out this line temporarily, then bundle.min.js is written and can be debugged
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('build-prod', function () {
    gulp.src(sources)
        .pipe(concat('bundle.min.js'))
        .pipe(ngAnnotate()).on('error', gutil.log)
        .pipe(uglify())
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('connect', function() {
    connect.server({
        root: './'
    });
});

gulp.task('watch', function() {
    gulp.watch(sources, ['build-dev']);
});

gulp.task('default', ['connect', 'build-dev', 'watch']);
