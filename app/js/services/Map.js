var app = angular.module('lakeViewApp');

app.factory('Map', function(CanvasLayer) {
    // Definition of available swisstopo tiles (bounding box) and resolutions
    // Source: https://api3.geo.admin.ch/services/sdiservices.html#parameters
    var TOP_LEFT = L.point(420000, 350000);
    var BOTTOM_RIGHT = L.point(900000, 30000);
    var RESOLUTIONS = [4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5];

    // Definition for projected coordinate system CH1903 / LV03
    // Source: https://epsg.io/21781.js
    var CRS = new L.Proj.CRS('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs', {
        resolutions: RESOLUTIONS,
        origin: [TOP_LEFT.x, TOP_LEFT.y]
    });

    function project(point) {
        return CRS.projection.project(point);
    };

    function unproject(point) {
        return CRS.projection.unproject(point);
    };

    function Map(mapId, topLeft, bottomRight) {
        var map = {
            _map: undefined,
            mapId: mapId
        };

        map._initMapbox = function() {
            var mbAttr = 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                         '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                         'Imagery © <a href="https://mapbox.com">Mapbox</a>';
            var mbUrl = 'https://{s}.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={access_token}';

            this._map = L.map(mapId);

            L.tileLayer(mbUrl, {
                subdomains: 'abcd',
                maxZoom: 18,
                attribution: mbAttr,
                id: 'mapbox.streets',
                access_token: 'pk.eyJ1IjoiYXBoeXMiLCJhIjoiY2ltM2g1MzUwMDBwOXZtbTVzdnQ1ZHZpYiJ9.Cm1TVUsbCQLOhUbblOrHfw'
                // lake-view token for user aphys obtained from mapbox.com
            }).addTo(this._map);
        }

        map._initSwisstopo = function() {
            var scale = function(zoom) {
                return 1 / RESOLUTIONS[zoom];
            };

            this._map = L.map(mapId, {
                crs: CRS,
                maxBounds: L.latLngBounds(unproject(TOP_LEFT), unproject(BOTTOM_RIGHT)),
                scale: scale
            });

            L.tileLayer('https://wmts{s}.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/21781/{z}/{y}/{x}.jpeg', {
                subdomains: ['', '5', '6', '7', '8', '9'],
                maxZoom: RESOLUTIONS.length - 1,
                minZoom: 15,
                attribution: 'Map data &copy; swisstopo'
            }).addTo(this._map);
        }

        map._initMapbox();
        map._map.fitBounds(L.latLngBounds(topLeft, bottomRight));

        return map;
    }

    return {
        initMap: Map,
        project: project,
        unproject: unproject
    };
});
