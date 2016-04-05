'use strict';

var gulp = require('gulp');

var concat = require('gulp-concat');
var connect = require('gulp-connect');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var sources = ['app/js/app.js', 'app/js/**/*.js', 'app/vendor/js/rbush/module.js', 'app/vendor/js/**/*.js'];

gulp.task('build', function () {
    gulp.src(sources)
        .pipe(sourcemaps.init())
        .pipe(concat('bundle.min.js'))
        .pipe(ngAnnotate())
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('connect', function() {
    connect.server({
        root: './'
    });
});

gulp.task('watch', function() {
    gulp.watch(sources, ['build']);
});

gulp.task('default', ['connect', 'build', 'watch']);
