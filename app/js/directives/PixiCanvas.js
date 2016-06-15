angular.module('lakeViewApp').directive('pixiCanvas', function(Util, $timeout) {
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

    function initScale(map) {
        var margin = {top: 10, right: 60, bottom: 20, left: 60};

        var svg = d3.select(map.getPanes().overlayPane)
            .append('svg')
            .attr('class', 'lv-scale');

        var g = svg.append('g');

        var scale = g.append('g').attr('class', 'chart-axis');

        var y = d3.scale.linear();
        var axis = d3.svg.axis()
            .scale(y)
            .orient('right')
            .tickFormat(function(d) { return d + ' m'; });

        map.on('move', resetScale);
        map.on('viewreset', resetScale);

        function resetScale() {
            var topLeft = map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(svg.node(), topLeft);

            var size = map.getSize();
            var topPixel = 0;
            var topDepth = map.containerPointToLatLng([0, margin.top]).lat;
            if (topDepth > 0) {
                topDepth = 0;
                topPixel = map.latLngToContainerPoint([0, 0]).y - margin.top;
            }
            var bottomPixel = size.y - margin.top - margin.bottom;
            var bottomDepth = map.containerPointToLatLng([0, margin.top + bottomPixel]).lat;

            var height = bottomPixel - topPixel;

            g.attr('transform', 'translate(' + (size.x - margin.right) + ',' + margin.top + ')')
                .style('visibility', height > 0 ? 'visible' : 'hidden');

            y.range([topPixel, bottomPixel]);
            y.domain([topDepth, bottomDepth]);
            axis.ticks(height / 50);
            scale.call(axis);
        }
    }

    return {
        restrict: 'E',
        scope: {
            active: '=',
            setHandler: '&',
            data: '=',
            draw: '=',
            source: '@',
            labelLeft: '@',
            labelRight: '@'
        },
        link: function(scope, element, attrs) {
            element.addClass('lv-map');
            var container = element[0];

            var bounds;
            var markers;
            var xMax;
            var map = L.map(container, {crs: CRS, minZoom: -5});
            var canvasLayer = L.canvasLayer({background: true, dataSource: scope.source});

            canvasLayer.addTo(map);
            L.control.showcoordinates({format: formatCoordinates}).addTo(map);

            scope.setHandler({handler: function() {
                canvasLayer.redraw();
            }});

            canvasLayer.setDrawFunction(scope.draw);

            initScale(map);

            scope.$watch('active', function() {
                if (scope.active) {
                    $timeout(function() {
                        map.invalidateSize(false);
                        if (bounds) {
                            map.fitBounds(bounds);
                            addLabels();
                        }
                    });
                }
            });

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

                    xMax = sliceLength * HORIZONTAL_SCALE;

                    var minBounds = unproject(L.point(0, data.zExtent[0]));
                    var maxBounds = unproject(L.point(xMax, data.zExtent[1]));
                    updateBounds(L.latLngBounds(minBounds, maxBounds));
                    addLabels();
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

            function addLabels() {
                if (scope.active && xMax && !markers) {
                    // map has to be visible and data has to be loaded for this to work correctly
                    markers = {
                        left: addPopup(L.point(0, 0), scope.labelLeft),
                        right: addPopup(L.point(xMax, 0), scope.labelRight)
                    }
                }
            }

            function addPopup(point, label) {
                return L.popup({closeButton: false, closeOnClick: false, autoPan: false})
                    .setLatLng(unproject(point))
                    .setContent(label).addTo(map);
            }
        }
    };
});
