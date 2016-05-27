angular.module('lakeViewApp').controller('TemperatureCtrl', function($scope, $q, Time, TemporalData, NearestNeighbor) {
    var dataReady = false;
    var colorFunction;
    var nearestNeighbor;
    var animationHandlers = [];

    $scope.LEGEND_COLORS = ['purple', 'cyan', 'lime', 'red'];

    $scope.surfaceData = new TemporalData('temperature');
    $scope.sliceDataXZ = new TemporalData('temperature', '_slice_xz');
    $scope.sliceDataYZ = new TemporalData('temperature', '_slice_yz');

    var dataSources = [$scope.surfaceData, $scope.sliceDataXZ, $scope.sliceDataYZ];

    $scope.$on('updateTimeSelection', function(evt, timeSelection) {
        dataReady = false;

        var dataQueue = dataSources.map(function(source) {
            return source.readData(timeSelection);
        });

        $q.all(dataQueue).then(function() {
            dataReady = true;
            var extent = globalExtent();
            colorFunction = generateColorFunction(extent);
            nearestNeighbor = NearestNeighbor($scope.surfaceData);
            $scope.dataExtent = extent;
            $scope.$emit('dataReady', $scope.surfaceData.timeSteps);
            animate();
        });

        $scope.closeChart();
    });

    $scope.$on('tick', animate);

    $scope.$watch('chartPoint', updateChart);

    $scope.addAnimationHandler = function(handler) {
        animationHandlers.push(handler);
    };

    $scope.closeChart = function() {
        $scope.chartPoint = undefined;
    };

    $scope.drawTemperatureOverlay = function(size, data) {
        var graphics = new PIXI.Graphics();

        if (!dataReady) {
            return graphics;
        }

        var bounds = new L.Bounds(L.point([0, 0]), size);

        // Loop over the grid to draw a quadrilateral (polygon with 4 vertices)
        // colored according to the local temperature for every point except
        // for the last row/column. The coordinates of neighboring points
        // from the next row/column are used to define the quadrilateral, which
        // is why the last row/column cannot be used.
        for (var i = 0; i < data.length - 1; i++) {
            var row = data[i];
            var nextRow = data[i + 1];
            for (var j = 0; j < row.length - 1; j++) {
                // The 4 points of the quadrilateral
                var points = [row[j], row[j + 1], nextRow[j], nextRow[j + 1]];

                // Check if all points are defined
                if (points.every(function(p) { return p; })) {

                    // Check if any point is within bounds
                    if (points.some(function(p) { return bounds.contains(p.p); })) {
                        var color = colorFunction(row[j].values[Time.tIndex]);

                        var p00 = points[0].p;
                        var p01 = points[1].p;
                        var p10 = points[2].p;
                        var p11 = points[3].p;

                        graphics.beginFill(+color.replace('#', '0x'));
                        graphics.moveTo(p00.x, p00.y);
                        graphics.lineTo(p01.x, p01.y);
                        graphics.lineTo(p11.x, p11.y);
                        graphics.lineTo(p10.x, p10.y);
                        graphics.endFill();
                    }
                }
            }
        }

        return graphics;
    };

    $scope.mapClicked = function(point) {
        $scope.chartPoint = nearestNeighbor.query(point);
    };

    /**
      * find global min/max over all data sources
      */
    function globalExtent() {
        var minValue = Number.MAX_VALUE;
        var maxValue = Number.MIN_VALUE;

        dataSources.forEach(function(source) {
            minValue = Math.min(minValue, source.valueExtent[0]);
            maxValue = Math.max(maxValue, source.valueExtent[1]);
        });

        return [minValue, maxValue];
    }

    function generateColorFunction(extent) {
        var minValue = extent[0];
        var maxValue = extent[1];

        var domain = $scope.LEGEND_COLORS.map(function(d, i) {
            return minValue + i / ($scope.LEGEND_COLORS.length - 1) * (maxValue - minValue);
        });
        return d3.scale.linear().domain(domain).range($scope.LEGEND_COLORS);
    }

    function updateChart(point) {
        if (point) {
            var data = $scope.surfaceData.Data[point.i][point.j];
            $scope.chartData = {
                x: data.x,
                y: data.y,
                data: $scope.surfaceData.withTimeSteps(data.values)
            };
        } else {
            $scope.chartData = undefined;
        }
    }

    function animate() {
        animationHandlers.forEach(function(handler) {
            handler(Time.tIndex);
        });
    }
});
