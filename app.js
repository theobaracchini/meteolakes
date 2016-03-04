// TODO: only do this in development environment
require('source-map-support').install();

require('angular').module("lakeViewApp", []);

require('./misc');
require('./temperatureCtrl');
require('./velocityCtrl');
require('./timeCtrl');
