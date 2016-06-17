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

            var w = 250;
            var h = 80;
            var margin = {top: 10, right: 20, bottom: 10, left: 10};
            var width = w - margin.left - margin.right;
            var height = h - margin.top - margin.bottom;

            var svg = d3.select(container)
                .append('svg')
                .attr('width', w)
                .attr('height', h);

            var gradient = svg
                .append('defs')
                .append('linearGradient')
                .attr('id', gradientId)
                .attr('x1', '0%')
                .attr('y1', '100%')
                .attr('x2', '100%')
                .attr('y2', '100%')
                .attr('spreadMethod', 'pad');

            var g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            scope.colors.forEach(function(color, i) {
                var offset = i * 100 / (scope.colors.length - 1);
                gradient
                    .append('stop')
                    .attr('offset', offset + '%')
                    .attr('stop-color', color)
                    .attr('stop-opacity', 1);
            });

            g
                .append('rect')
                .attr('width', width)
                .attr('height', 20)
                .style('fill', 'url(#' + gradientId + ')');

            var legend = g
                .append('g')
                .attr('class', 'chart-axis x')
                .attr('transform', 'translate(0, 22)');

            legend
                .append('text')
                .attr('y', 40)
                .attr('dx', '.71em')
                .style('text-anchor', 'start')
                .text(scope.label);

            scope.$watch('extent', function(extent) {
                if (extent) {
                    var x = d3.scale.linear()
                        .range([0, width])
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
