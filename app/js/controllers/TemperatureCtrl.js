angular.module('lakeViewApp').controller('TemperatureCtrl', function($rootScope, $scope, $element, Time, Chart, TemporalData, Map, rbush, knn) {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    var LEGEND_COLORS = ['purple', 'cyan', 'lime', 'red'];

    var timeSelection;

    var isDataReady = false;
    var c; // coloring function
    var colorLegend = prepareLegend();

    var canvasLayer;
    var knnTree;
    var marker;
    var map;

    Initialize();

    // ========================================================================
    // INIT (I know, code above is also some initialization. Deal with it.)
    // ========================================================================
    function Initialize() {
        $scope.$on('updateTimeSelection', function(evt, newTimeSelection) {
            isDataReady = false;
            var recenterMap = !timeSelection || (newTimeSelection.lake != timeSelection.lake);

            // clone object
            timeSelection = $.extend({}, newTimeSelection);

            if (!$scope.tData) {
                $scope.tData = new TemporalData('temperature');
            }

            $scope.tData.readData(timeSelection.folder, timeSelection.week, timeSelection.year).then(function() {
                $scope.tData.SwitchToData(timeSelection.week, timeSelection.year);
                dataReady();
                prepareGraphics(recenterMap);
            });
        });

        $scope.Chart = new Chart($scope, Time, $element.find('.lv-plot'), function(d) { return d })

        $scope.$on('tick', animate);
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function dataReady() {
        var tMin = d3.min($scope.tData.flatArray, function(d) { return d3.min(d.values) });
        var tMax = d3.max($scope.tData.flatArray, function(d) { return d3.max(d.values) });

        var domain = LEGEND_COLORS.map(function(d, i) {
            return tMin + i / (LEGEND_COLORS.length - 1) * (tMax - tMin);
        });
        c = d3.scale.linear().domain(domain).range(LEGEND_COLORS);

        // Prepare all thingies
        updateLegend(tMin, tMax);
        $scope.Chart.UpdateChart($scope.tData.DataTime).Max(tMax).Min(tMin);

        var noValues = $scope.tData.flatArray[0].values.length;

        // TODO refactor
        $rootScope.$emit('dataReady', noValues);

        isDataReady = true;
    }

    function prepareGraphics(centerMap) {
        if (!map) {
            map = Map.initMap($element.find('.lv-map')[0]);
        }

        if (centerMap) {
            var minBounds = Map.unproject(L.point($scope.tData.xMin, $scope.tData.yMin));
            var maxBounds = Map.unproject(L.point($scope.tData.xMax, $scope.tData.yMax));
            map._map.fitBounds(L.latLngBounds(minBounds, maxBounds));            
        }

        if (!canvasLayer) {
            canvasLayer = L.canvasLayer();
            canvasLayer.addTo(map._map);
        }

        var data = $scope.tData.map(function(d) {
            var latlng = Map.unproject(L.point(d.x, d.y));
            return {
                lat: latlng.lat,
                lng: latlng.lng,
                values: d.values
            }
        });

        canvasLayer.setData(data);
        canvasLayer.setOptions({colorFunction: c});

        knnTree = rbush(9, ['.x', '.y', '.x', '.y']);
        knnTree.load($scope.tData.flatArray);
        map._map.on('click', function(e) {
            var p = Map.project(e.latlng);
            var closestPoint = knn(knnTree, [p.x, p.y], 1)[0];
            var latlng = Map.unproject(L.point(closestPoint.x, closestPoint.y));
            if (marker) {
                marker.setLatLng(latlng);
            } else {
                marker = L.marker(latlng).addTo(map._map);
            }
            $scope.Chart.SelectPoint(closestPoint);
            var fakeStartDate = moment('1970-01-01');
            var data = closestPoint.values.map(function(d, i) {
                return {
                    date: fakeStartDate.clone().add(i * 3, 'hours').toDate(),
                    value: d
                };
            });
            $scope.chartData = {
                x: closestPoint.x,
                y: closestPoint.y,
                data: data
            };
            $scope.$apply();
        });

        animate();
    }

    $scope.closeChart = function() {
        if (marker) {
            map._map.removeLayer(marker);
            marker = undefined;
        }
        $scope.Chart.Close();
    }

    function prepareLegend() {
        var w = 300, h = 80;
        var key = d3.select($element.find('.lv-legend')[0]).append('svg').attr('id', 'key').attr('width', w).attr('height', h);
        var legend = key.append('defs').append('svg:linearGradient').attr('id', 'tempGradient').attr('x1', '0%').attr('y1', '100%').attr('x2', '100%').attr('y2', '100%').attr('spreadMethod', 'pad');
        LEGEND_COLORS.forEach(function(color, i) {
            var offset = i * 100 / (LEGEND_COLORS.length - 1);
            legend.append('stop').attr('offset', offset + '%').attr('stop-color', color).attr('stop-opacity', 1);
        });
        key.append('rect').attr('width', w - 100).attr('height', h - 60).style('fill', 'url(#tempGradient)')
        var color = key.append('g').attr('class', 'x axis').attr('transform', 'translate(0,22)');
        color.append('text').attr('y', 42).attr('dx', '.71em').style('text-anchor', 'start').text('Temperature (°C)');
        return color;
    }

    function updateLegend(tMin, tMax) {
        var x = d3.scale.linear().range([0, 200]).domain([tMin, tMax]);
        var xAxis = d3.svg.axis().scale(x).ticks(4).orient('bottom');
        colorLegend.call(xAxis);
    }

    function animate() {
        if(!isDataReady) return;

        canvasLayer.setStep(Time.tIndex);

        // render the timeline on the chart
        $scope.Chart.UpdateTimeLine();
    }
});
