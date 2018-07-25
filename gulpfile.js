'use strict';

var gulp = require('gulp');

var concat = require('gulp-concat');
var connect = require('gulp-connect');
var eslint = require('gulp-eslint');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var sources = ['app/**/*.module.js', 'app/**/module.js', 'app/**/*.js'];

var lintSources = ['gulpfile.js', 'app/**/*.js'];

gulp.task('build-dev', function() {
    gulp.src(sources)
        .pipe(sourcemaps.init())
        .pipe(ngAnnotate())
        .pipe(concat('bundle.min.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('build-prod', function() {
    gulp.src(sources)
        .pipe(ngAnnotate())
        .pipe(concat('bundle.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('connect', function() {
    connect.server({
        root: './',
        port: 8080
    });
});

gulp.task('watch', function() {
    gulp.watch(sources, ['build-dev']);
});

gulp.task('lint-fix', function() {
    // Fix lint errors automatically where applicable
    return gulp.src(lintSources, { base: './' })
        .pipe(eslint({ fix: true }))
        .pipe(eslint.format())
        .pipe(gulp.dest('./'));
});

gulp.task('lint', function() {
    return gulp.src(lintSources)
        .pipe(eslint())
        // Output lint results to the console
        .pipe(eslint.format())
        // Exit with error code (1) on lint error
        .pipe(eslint.failAfterError());
});

gulp.task('default', ['connect', 'build-dev', 'watch']);
gulp.task('test', ['lint']);
