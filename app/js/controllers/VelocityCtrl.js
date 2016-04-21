angular.module('lakeViewApp').controller('VelocityCtrl', function($scope, $element, Time, TemporalData, Map, rbush, knn) {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

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
    // INIT (I know, code above is also initialization. Deal with it.)
    // ========================================================================
    function Initialize() {
        $scope.$on('updateTimeSelection', function(evt, newTimeSelection) {
            isDataReady = false;
            var recenterMap = !timeSelection || (newTimeSelection.lake != timeSelection.lake);

            // clone object
            timeSelection = $.extend({}, newTimeSelection);

            if (!$scope.tData) {
                $scope.tData = new TemporalData('velocity');
            }

            $scope.tData.readData(timeSelection).then(function() {
                dataReady();
                prepareGraphics(recenterMap);
            });
        });

        $scope.$on('tick', animate);
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /*
     * Call this method whenever a new bunch of data has been read and is ready
     * to be displayed. 
     * Updates the legend and the axis.
     */
    function dataReady() {
        var minVel = d3.min($scope.tData.flatArray, function(d) {
            return d3.min(d.values, norm);
        });
        var maxVel = d3.max($scope.tData.flatArray, function(d) {
            return d3.max(d.values, norm);
        });

        c = d3.scale.linear().domain([minVel, (minVel+maxVel)/2, maxVel]).range(['blue', 'lime', 'red']);

        // Prepare all thingies
        updateLegend(minVel, maxVel);

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
        canvasLayer.setOptions({colorFunction: colorFunction, simplify: true, radius: 30});

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
        var legend = key.append('defs').append('svg:linearGradient').attr('id', 'velGradient').attr('x1', '0%').attr('y1', '100%').attr('x2', '100%').attr('y2', '100%').attr('spreadMethod', 'pad');
        legend.append('stop').attr('offset', '0%').attr('stop-color', 'blue').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '50%').attr('stop-color', 'lime').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '100%').attr('stop-color', 'red').attr('stop-opacity', 1);
        key.append('rect').attr('width', w - 100).attr('height', h - 60).style('fill', 'url(#velGradient)');
        var color = key.append('g').attr('class', 'chart-axis x').attr('transform', 'translate(0,22)');
        color.append('text').attr('y', 42).attr('dx', '.71em').style('text-anchor', 'start').text('Velocity (m/s)');        
        return color;
    }

    function updateLegend(minVel, maxVel) {
        var x = d3.scale.linear().range([0, 200]).domain([minVel, maxVel]);
        var xAxis = d3.svg.axis().scale(x).ticks(4).orient('bottom');
        colorLegend.call(xAxis);
    }

    /*
     * This function runs under a timer. It is in charge of rendering the canvas.
     * Do not call this directly.
     */
    function animate() {
        if(!isDataReady) return;

        canvasLayer.setStep(Time.tIndex);
    }

    function colorFunction(vec) {
        return c(norm(vec));
    }

    /*
     * Returns the norm of a vector.
     * The vector is expected to be an array [x, y].
     */
    function norm(vec) {
        return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    }
});
