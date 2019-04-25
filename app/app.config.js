'use strict';

angular.module('meteolakesApp').config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
        $locationProvider.hashPrefix('!');

        $routeProvider
        .when('/hydro', {
            template: '<page-hydro></page-hydro>'
        })
        .when('/quality', {
            template: '<page-quality></page-quality>'
        })
        .when('/remote', {
            template: '<page-remote></page-remote>'
        })
        .when('/insitu', {
            template: '<page-insitu></page-insitu>'
        })
        .when('/about', {
            template: '<page-about></page-about>'
        })
        .when('/data', {
            template: '<page-data-form></page-data-form>'
        })
        .when('/info', {
            template: '<page-info></page-info>'
        })
        .otherwise('/hydro');
    }
]);
