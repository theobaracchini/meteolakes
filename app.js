// TODO: only do this in development environment
require('source-map-support').install();

angular.module("lakeViewApp", []);

require('./misc');
require('./temperatureCtrl');
require('./velocityCtrl');
require('./timeCtrl');
