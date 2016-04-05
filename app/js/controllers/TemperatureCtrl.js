angular.module('lakeViewApp').controller('TemperatureCtrl', function($rootScope, $scope, $element, Time, Chart, TemporalData, Map, rbush, knn) {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

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
        $rootScope.$on('reloadWeek', function(evt, time) {
            isDataReady = false;

            if (!$scope.tData) {
                $scope.tData = new TemporalData('temperature');
            }

            $scope.tData.readData(time.folder, time.week, time.year).then(function() {
                $scope.tData.SwitchToData(time.week, time.year);
                dataReady();
                prepareGraphics();
            });
        });

        $scope.Chart = new Chart($scope, Time, $element.find('.lv-plot'), function(d) { return d })

        $rootScope.$on('tick', animate);

        $rootScope.$emit('scopeReady');
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function dataReady() {
        var tMin = d3.min($scope.tData.flatArray, function(d) { return d3.min(d.values) });
        var tMax = d3.max($scope.tData.flatArray, function(d) { return d3.max(d.values) });

        c = d3.scale.linear().domain([tMin, (tMin+tMax)/2, tMax]).range(['blue', 'lime', 'red']);

        // Prepare all thingies
        updateLegend(tMin, tMax);
        $scope.Chart.UpdateChart($scope.tData.DataTime).Max(tMax).Min(tMin);

        var noValues = $scope.tData.flatArray[0].values.length;
        $rootScope.$emit('dataReady', noValues);

        isDataReady = true;
    }

    function prepareGraphics() {
        if (!map) {
            var minBounds = L.point($scope.tData.xMin, $scope.tData.yMin);
            var maxBounds = L.point($scope.tData.xMax, $scope.tData.yMax);
            map = Map.initMap($element.find('.lv-map')[0], Map.unproject(minBounds), Map.unproject(maxBounds));
        }

        if (!canvasLayer) {
            canvasLayer = L.canvasLayer();
            canvasLayer.addTo(map._map);
        }

        var temperatureData = $scope.tData.map(function(d) {
            var latlng = Map.unproject(L.point(d.x, d.y));
            return {
                lat: latlng.lat,
                lng: latlng.lng,
                values: d.values
            }
        });

        canvasLayer.setData(temperatureData);
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
        var w = 300, h = 120;
        var key = d3.select($element.find('.lv-legend')[0]).append('svg').attr('id', 'key').attr('width', w).attr('height', h);
        var legend = key.append('defs').append('svg:linearGradient').attr('id', 'gradient').attr('x1', '0%').attr('y1', '100%').attr('x2', '100%').attr('y2', '100%').attr('spreadMethod', 'pad');
        legend.append('stop').attr('offset', '0%').attr('stop-color', 'blue').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '50%').attr('stop-color', 'lime').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '100%').attr('stop-color', 'red').attr('stop-opacity', 1);
        key.append('rect').attr('width', w - 100).attr('height', h - 100).style('fill', 'url(#gradient)')
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