'use strict';

angular.module('lakeViewApp').config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
        $locationProvider.hashPrefix('!');

        $routeProvider
        .when('/hydro', {
            template: '<hydro></hydro>'
        })
        .when('/quality', {
            template: '<quality></quality>'
        })
        .when('/remote', {
            template: '<remote></remote>'
        })
        .when('/insitu', {
            template: '<insitu></insitu>'
        })
        .when('/about', {
            template: '<about></about>'
        })
        .otherwise('/hydro');
    }
  ]);
