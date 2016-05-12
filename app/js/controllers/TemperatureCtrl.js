angular.module('lakeViewApp').controller('TemperatureCtrl', function($scope, Time, TemporalData, NearestNeighbor) {
    var colorFunction;

    var nearestNeighbor;
    var marker;
    var chartPoint;

    var animationHandlers = [];

    $scope.LEGEND_COLORS = ['purple', 'cyan', 'lime', 'red'];

    $scope.$on('updateTimeSelection', function(evt, timeSelection) {
        if (!$scope.temporalData) {
            $scope.temporalData = new TemporalData('temperature');
        }

        $scope.temporalData.readData(timeSelection).then(function() {
            dataReady();
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

        var bounds = new L.Bounds(L.point([0, 0]), size);

        for (var i = 0; i < data.length - 1; i++) {
            var row = data[i];
            var nextRow = data[i + 1];
            for (var j = 0; j < row.length - 1; j++) {
                if (row[j] && row[j + 1] && nextRow[j] && nextRow[j + 1]) {
                    if (bounds.contains(row[j].p)) {
                        // TODO correct 1/2 cell shift
                        var color = colorFunction(row[j].values[Time.tIndex]);

                        var p00 = row[j].p;
                        var p01 = row[j + 1].p;
                        var p10 = nextRow[j].p;
                        var p11 = nextRow[j + 1].p;

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

    function dataReady() {
        var minValue = d3.min($scope.temporalData.flatArray, function(d) { return d3.min(d.values) });
        var maxValue = d3.max($scope.temporalData.flatArray, function(d) { return d3.max(d.values) });

        $scope.dataExtent = [minValue, maxValue];

        var domain = $scope.LEGEND_COLORS.map(function(d, i) {
            return minValue + i / ($scope.LEGEND_COLORS.length - 1) * (maxValue - minValue);
        });
        colorFunction = d3.scale.linear().domain(domain).range($scope.LEGEND_COLORS);

        nearestNeighbor = NearestNeighbor($scope.temporalData);

        $scope.$emit('dataReady', $scope.temporalData.timeSteps);
    }

    function updateChart(point) {
        if (point) {
            var data = $scope.temporalData.Data[point.i][point.j];
            $scope.chartData = {
                x: data.x,
                y: data.y,
                data: $scope.temporalData.withTimeSteps(data.values)
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
