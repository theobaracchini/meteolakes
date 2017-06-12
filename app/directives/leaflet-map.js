angular.module('meteolakesApp').directive('leafletMap', function(CanvasLayer, ShowCoordinates, MapHelpers, $timeout) {
    //
    function initMapbox(container) {
        var mbAttr = 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                     '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                     'Imagery © <a href="https://mapbox.com">Mapbox</a>';
        var mbUrl = 'https://{s}.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={access_token}';

        L.Map.mergeOptions({
            touchExtend: true
        });

        L.Map.TouchExtend = L.Handler.extend({

            initialize: function(_map) {
                this._map = _map;
                this._container = _map._container;
                this._pane = _map._panes.overlayPane;
            },

            addHooks: function() {
                L.DomEvent.on(this._container, 'touchstart', this._onTouchStart, this);
                L.DomEvent.on(this._container, 'touchend', this._onTouchEnd, this);
            },

            removeHooks: function() {
                L.DomEvent.off(this._container, 'touchstart', this._onTouchStart);
                L.DomEvent.off(this._container, 'touchend', this._onTouchEnd);
            },

            _onTouchStart: function(e) {
                if (!this._map._loaded) { return; }

                var type = 'touchstart';

                var containerPoint = this._map.mouseEventToContainerPoint(e);
                var layerPoint = this._map.containerPointToLayerPoint(containerPoint);
                var latlng = this._map.layerPointToLatLng(layerPoint);

                this._map.fire(type, {
                    latlng: latlng,
                    layerPoint: layerPoint,
                    containerPoint: containerPoint,
                    originalEvent: e
                });
            },

            _onTouchEnd: function(e) {
                if (!this._map._loaded) { return; }

                var type = 'touchend';

                this._map.fire(type, {
                    originalEvent: e
                });
            }
        });
        L.Map.addInitHook('addHandler', 'touchExtend', L.Map.TouchExtend);

        var map = L.map(container);


        L.tileLayer(mbUrl, {
            subdomains: 'abcd',
            maxZoom: 18,
            attribution: mbAttr,
            id: 'mapbox.streets',
            access_token: 'pk.eyJ1IjoiYXBoeXMiLCJhIjoiY2ltM2g1MzUwMDBwOXZtbTVzdnQ1ZHZpYiJ9.Cm1TVUsbCQLOhUbblOrHfw'
            // lake-view token for user aphys obtained from mapbox.com
        }).addTo(map);

        return map;
    }

    return {
        restrict: 'E',
        scope: {
            active: '=',
            setHandler: '&',
            onClick: '&',
            marker: '=',
            data: '=',
            init: '=',
            draw: '='
        },
        link: function(scope, element, attrs) {
            element.addClass('lv-map');
            var container = element[0];

            var bounds;
            var map = initMapbox(container);
            var canvasLayer = L.canvasLayer({ dataSource: 'surface' });
            var markerLayer;
            var touchStartTime;
            var touchStartlatlng;
            var SINGLE_CLICK_DURATION_MS = 300;

            if (typeof scope.init === 'function') {
                scope.init(map);
            }

            canvasLayer.addTo(map);
            L.control.showcoordinates({ format: MapHelpers.formatCoordinates }).addTo(map);

            scope.setHandler({ handler: function() {
                canvasLayer.redraw();
            } });

            scope.$emit('mapLoaded', map);

            map.on('click', function(e) {
                scope.onClick({
                    point: MapHelpers.project(e.latlng),
                    latLngToLayerPoint: map.latLngToLayerPoint
                });
                scope.$apply();
            });

            map.on('touchstart', function(e) {
                touchStartlatlng = e.latlng;
                touchStartTime = Date.now();
            });

            map.on('touchend', function() {
                var diff = Date.now() - touchStartTime;
                if (diff < SINGLE_CLICK_DURATION_MS) {
                    scope.onClick({
                        point: MapHelpers.project(touchStartlatlng),
                        mapPoint: map.latLngToLayerPoint(touchStartlatlng)
                    });
                    scope.$apply();
                }
            });

            scope.$on('particleAdded', function() {
                canvasLayer.redraw();
            });

            canvasLayer.setDrawFunction(scope.draw);

            scope.$watch('active', function() {
                if (scope.active) {
                    $timeout(function() {
                        map.invalidateSize(false);
                        fitBounds();
                    });
                }
            });

            scope.$watch('marker', function(marker) {
                if (scope.active && marker) {
                    // Update marker
                    var latlng = MapHelpers.unproject(marker);
                    if (markerLayer) {
                        markerLayer.setLatLng(latlng);
                    } else {
                        markerLayer = L.marker(latlng).addTo(map);
                    }
                } else if (markerLayer) {
                    // Remove marker
                    map.removeLayer(markerLayer);
                    markerLayer = null;
                }
            });

            scope.$watch('data.ready', function() {
                var data = scope.data;

                if (data && data.ready) {
                    var minBounds = MapHelpers.unproject(L.point(data.xExtent[0], data.yExtent[0]));
                    var maxBounds = MapHelpers.unproject(L.point(data.xExtent[1], data.yExtent[1]));
                    updateBounds(L.latLngBounds(minBounds, maxBounds));

                    var projectedData = data.map(function(d) {
                        var latlng = MapHelpers.unproject(L.point(d.x, d.y));
                        return {
                            lat: latlng.lat,
                            lng: latlng.lng,
                            values: d.values
                        };
                    });
                    canvasLayer.setData(projectedData);
                }
            });

            function updateBounds(newBounds) {
                if (!newBounds.equals(bounds)) {
                    bounds = newBounds;
                    fitBounds();
                }
            }

            function fitBounds() {
                if (bounds) {
                    // zoom map such that at least 90% of the area given by bounds is visible
                    map.fitBounds(bounds.pad(-0.05));
                }
            }
        }
    };
});
