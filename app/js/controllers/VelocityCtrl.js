angular.module('lakeViewApp').controller('VelocityCtrl', function($scope, Time, TemporalData, NearestNeighbor, Util) {
    var colorFunction;
    var nearestNeighbor;
    var animationHandlers = [];

    $scope.LEGEND_COLORS = ['blue', 'lime', 'red'];

    $scope.surfaceData = new TemporalData('velocity');
    $scope.surfaceData.setValueAccessor(Util.norm);

    $scope.$on('updateTimeSelection', function(evt, timeSelection) {
        $scope.surfaceData.readData(timeSelection).then(function() {
            colorFunction = generateColorFunction($scope.surfaceData.valueExtent);
            nearestNeighbor = NearestNeighbor($scope.surfaceData);
            $scope.surfaceExtent = $scope.surfaceData.valueExtent;
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
        $scope.chartPoint = null;
    };

    $scope.drawVelocityOverlay = function(data, options) {
        var size = options.size;
        var r = 30,
            bounds = new L.Bounds(
                L.point([-r, -r]),
                size.add([r, r])),

            cellSize = r / 2,
            grid = [],
            i, len, d, p, cell, x, y, j, len2;

        for (i = 0, len = data.length; i < len; i++) {
            var row = data[i];
            for (var j = 0; j < row.length; j++) {
                d = row[j];
                if (d) {
                    if (bounds.contains(d.p)) {
                        x = Math.floor((d.p.x) / cellSize) + 2;
                        y = Math.floor((d.p.y) / cellSize) + 2;

                        var value = d.values[Time.tIndex];

                        grid[y] = grid[y] || [];
                        cell = grid[y][x];

                        if (!cell) {
                            grid[y][x] = [d.p.x, d.p.y, value[0], value[1], 1];
                        } else {
                            cell[0] += d.p.x;
                            cell[1] += d.p.y;
                            cell[2] += value[0];
                            cell[3] += value[1];
                            cell[4]++;
                        }
                    }
                }
            }
        }

        var graphics = new PIXI.Graphics();
        for (i = 0, len = grid.length; i < len; i++) {
            if (grid[i]) {
                for (j = 0, len2 = grid[i].length; j < len2; j++) {
                    cell = grid[i][j];
                    if (cell) {
                        var x = cell[0] / cell[4];
                        var y = cell[1] / cell[4];
                        var dx = cell[2] / cell[4]
                        var dy = cell[3] / cell[4]
                        var color = colorFunction([dx, dy]);

                        // TODO use max velocity to determine scale factor
                        drawArrow(x, y, dx, -dy, color, graphics);
                    }
                }
            }
        }

        return graphics;
    };

    $scope.mapClicked = function(point) {
        $scope.chartPoint = nearestNeighbor.query(point);
    };

    function drawArrow(x, y, dx, dy, color, graphics) {
        var extent = Math.sqrt(dx * dx + dy * dy);
        if (extent > 0.001) {
            var clampedExtent = Math.min(extent, 0.1);
            var fromx = x;
            var fromy = y;
            var tox = x + 500 * dx / extent * clampedExtent;
            var toy = y + 500 * dy / extent * clampedExtent;

            var headlen = 100 * clampedExtent;   // length of head in pixels
            var angle = Math.atan2(toy - fromy, tox - fromx);

            graphics.lineStyle(1 + 5 * extent, +color.replace('#', '0x'));
            graphics.moveTo(fromx, fromy);
            graphics.lineTo(tox, toy);
            graphics.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
            graphics.moveTo(tox, toy);
            graphics.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        }
    }

    function generateColorFunction(extent) {
        var minValue = extent[0];
        var maxValue = extent[1];

        var domain = $scope.LEGEND_COLORS.map(function(d, i) {
            return minValue + i / ($scope.LEGEND_COLORS.length - 1) * (maxValue - minValue);
        });
        return function(vec) {
            var fn = d3.scale.linear().domain(domain).range($scope.LEGEND_COLORS);
            return fn(Util.norm(vec));
        }
    }

    function updateChart(point) {
        if (point) {
            var data = $scope.surfaceData.Data[point.i][point.j];
            var values = data.values.map(Util.norm);
            $scope.chartData = {
                x: data.x,
                y: data.y,
                z: data.z,                
                data: $scope.surfaceData.withTimeSteps(values)
            };
        } else {
            $scope.chartData = null;
        }
    }

    function animate() {
        animationHandlers.forEach(function(handler) {
            handler(Time.tIndex);
        });
    }
});
