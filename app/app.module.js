'use strict';

// Prevent pixi.js from spamming the dev console
PIXI.utils._saidHello = true;

angular.module('meteolakesApp', ['rbush', 'stats', 'ngAnimate', 'ngRoute']);
