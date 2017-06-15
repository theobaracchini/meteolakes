angular.module('meteolakesApp').service('MapHelpers', function() {
    // Definition of available swisstopo tiles (bounding box) and resolutions
    // Source: https://api3.geo.admin.ch/services/sdiservices.html#parameters
    var TOP_LEFT = L.point(420000, 350000);
    var BOTTOM_RIGHT = L.point(900000, 30000);
    var RESOLUTIONS = [4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000,
        1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5];

    // Definition for projected coordinate system CH1903 / LV03
    // Source: https://epsg.io/21781.js
    var CRS = new L.Proj.CRS('EPSG:21781',
        '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs',
        {
            resolutions: RESOLUTIONS,
            origin: [TOP_LEFT.x, TOP_LEFT.y]
        });

    var BOUNDS = L.latLngBounds(unproject(TOP_LEFT), unproject(BOTTOM_RIGHT));

    this.project = project;

    function project(point) {
        return CRS.projection.project(point);
    }

    this.unproject = unproject;

    function unproject(point) {
        return CRS.projection.unproject(point);
    }

    this.formatCoordinates = function(latlng) {
        if (BOUNDS.contains(latlng)) {
            var p = project(latlng);
            return Math.round(p.x) + ', ' + Math.round(p.y);
        }
        return '';
    };
});
