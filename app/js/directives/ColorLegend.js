angular.module('lakeViewApp').directive('colorLegend', function() {
    var count = 0;

    return {
        restrict: 'E',
        scope: {
            colors: '=',
            extent: '=',
            label: '@'
        },
        link: function(scope, element, attrs) {
            var container = element[0];

            // Generate unique id for gradient
            count++;
            var gradientId = 'color-legend-gradient-' + count;

            var w = 300;
            var h = 80;
            var key = d3.select(container)
                .append('svg')
                .attr('id', 'key')
                .attr('width', w)
                .attr('height', h);

            var gradient = key
                .append('defs')
                .append('linearGradient')
                .attr('id', gradientId)
                .attr('x1', '0%')
                .attr('y1', '100%')
                .attr('x2', '100%')
                .attr('y2', '100%')
                .attr('spreadMethod', 'pad');

            scope.colors.forEach(function(color, i) {
                var offset = i * 100 / (scope.colors.length - 1);
                gradient
                    .append('stop')
                    .attr('offset', offset + '%')
                    .attr('stop-color', color)
                    .attr('stop-opacity', 1);
            });

            key
                .append('rect')
                .attr('width', w - 100)
                .attr('height', h - 60)
                .style('fill', 'url(#' + gradientId + ')');

            var legend = key
                .append('g')
                .attr('class', 'chart-axis x')
                .attr('transform', 'translate(0, 22)');

            legend
                .append('text')
                .attr('y', 42)
                .attr('dx', '.71em')
                .style('text-anchor', 'start')
                .text(scope.label);

            scope.$watch('extent', function(extent) {
                if (extent) {
                    var x = d3.scale.linear()
                        .range([0, 200])
                        .domain(extent);

                    var xAxis = d3.svg.axis()
                        .scale(x)
                        .ticks(4)
                        .orient('bottom');

                    legend.call(xAxis);
                }
            });
        }
    };
});
