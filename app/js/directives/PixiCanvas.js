angular.module('lakeViewApp').directive('pixiCanvas', function(Util) {
    var TOP_LEFT = L.point(0, 0);
    var BOTTOM_RIGHT = L.point(1e6, 1e6);
    var HORIZONTAL_SCALE = 0.02;
    var CRS = L.CRS.Simple;

    function project(point) {
        return CRS.projection.project(point);
    }

    function unproject(point) {
        return CRS.projection.unproject(point);
    }

    function formatCoordinates(latlng) {
        var p = project(latlng);
        return Math.round(p.x / HORIZONTAL_SCALE) + ', ' + Math.round(p.y);
    }

    return {
        restrict: 'E',
        scope: {
            setHandler: '&',
            data: '=',
            draw: '=',
            source: '@'
        },
        link: function(scope, element, attrs) {
            element.addClass('lv-map');
            var container = element[0];

            var bounds;
            var map = L.map(container, {crs: CRS, minZoom: -5});
            var canvasLayer = L.canvasLayer({background: true, dataSource: scope.source});

            canvasLayer.addTo(map);
            L.control.showcoordinates({format: formatCoordinates}).addTo(map);

            scope.setHandler({handler: function() {
                canvasLayer.redraw();
            }});

            canvasLayer.setDrawFunction(scope.draw);

            scope.$watch('data.ready', function() {
                var data = scope.data;

                var projectedData;

                if (data && data.ready) {
                    var sliceLength = 0;
                    var prevI = 0;
                    var prevX;
                    var prevY;
                    projectedData = data.map(function(d, i, j) {
                        if (i != prevI) {
                            if (prevX) {
                                sliceLength += Util.norm([d.x - prevX, d.y - prevY]);
                            }
                            prevI = i;
                            prevX = d.x;
                            prevY = d.y;
                        }
                        var x = sliceLength * HORIZONTAL_SCALE;
                        var y = d.z;
                        var latlng = unproject(L.point(x, y));
                        return {
                            lat: latlng.lat,
                            lng: latlng.lng,
                            values: d.values
                        }
                    });

                    var minBounds = unproject(L.point(0, data.zExtent[0]));
                    var maxBounds = unproject(L.point(sliceLength * HORIZONTAL_SCALE, data.zExtent[1]));
                    updateBounds(L.latLngBounds(minBounds, maxBounds));
                }

                if (bounds) {
                    canvasLayer.setData(projectedData);
                }
            });

            function updateBounds(newBounds) {
                if (!newBounds.equals(bounds)) {
                    bounds = newBounds;
                    map.fitBounds(bounds);
                }
            }
        }
    };
});
