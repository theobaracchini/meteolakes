angular.module('lakeViewApp').controller('TemperatureCtrl', function($scope, $element, Time, TemporalData, NearestNeighbor) {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    var LEGEND_COLORS = ['purple', 'cyan', 'lime', 'red'];

    var colorFunction;
    var colorLegend = prepareLegend();

    var nearestNeighbor;
    var marker;
    var chartPoint;

    var animationHandlers = [];

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
        var tMin = d3.min($scope.temporalData.flatArray, function(d) { return d3.min(d.values) });
        var tMax = d3.max($scope.temporalData.flatArray, function(d) { return d3.max(d.values) });

        var domain = LEGEND_COLORS.map(function(d, i) {
            return tMin + i / (LEGEND_COLORS.length - 1) * (tMax - tMin);
        });
        colorFunction = d3.scale.linear().domain(domain).range(LEGEND_COLORS);

        // Prepare all thingies
        updateLegend(tMin, tMax);

        nearestNeighbor = NearestNeighbor($scope.temporalData);

        $scope.$emit('dataReady', $scope.temporalData.timeSteps);
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
        var color = key.append('g').attr('class', 'chart-axis x').attr('transform', 'translate(0,22)');
        color.append('text').attr('y', 42).attr('dx', '.71em').style('text-anchor', 'start').text('Temperature (°C)');
        return color;
    }

    function updateLegend(tMin, tMax) {
        var x = d3.scale.linear().range([0, 200]).domain([tMin, tMax]);
        var xAxis = d3.svg.axis().scale(x).ticks(4).orient('bottom');
        colorLegend.call(xAxis);
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
