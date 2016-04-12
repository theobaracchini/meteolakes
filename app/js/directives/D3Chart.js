angular.module('lakeViewApp').directive('d3Chart', function($window) {
    return {
        restrict: 'E',
        scope: {
            data: '=',
            label: '@'
        },
        link: function(scope, element, attrs) {
            var data;
            var label;

            var margin = {top: 20, right: 20, bottom: 30, left: 50},
                width = 1000,
                height = 500 - margin.top - margin.bottom;

            var x = d3.time.scale();

            var y = d3.scale.linear()
                .range([height, 0]);

            // x axis format: Show hours/minutes if nonzero, otherwise
            // show short month name and day of the month
            var format = d3.time.format.multi([
                ["%H:%M", function(d) { return d.getHours() || d.getMinutes(); }],
                ["%b %d", function() { return true; }]
            ]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickFormat(format);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left');

            var line = d3.svg.line()
                .x(function(d) { return x(d.date); })
                .y(function(d) { return y(d.value); });

            var svg = d3.select(element[0]).append('svg')
                .style('width', '100%')
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + height + ')');

            svg.append('g')
                .attr('class', 'y axis')
                .append('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', 6)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'end')
                    .text(scope.label);

            svg.append('text')
                .attr('class', 'chart-label')
                .attr('text-anchor', 'middle');

            svg.append('path')
                .attr('class', 'line');

            // Run digest on window resize; this is required to detect container size changes
            angular.element($window).bind('resize', function() {
                scope.$apply();
            });
            // Update width and re-render on container size change
            scope.$watch(function() {
                    return element[0].offsetWidth;
                }, function(containerWidth) {
                    width = containerWidth - (margin.left + margin.right);
                    render();
                }
            );

            // watch for data changes and re-render
            scope.$watch('data', function(values) {
                if (values) {
                    data = values.data;
                    label = 'Location: ' + values.x + ' / ' + values.y;
                    x.domain(d3.extent(data, function(d) { return d.date; }));
                    y.domain(d3.extent(data, function(d) { return d.value; }));
                    render();
                }
            });

            function render() {
                if (data) {
                    x.range([0, width]);

                    var transition = svg.transition();

                    transition.select('.x.axis').call(xAxis);
                    transition.select('.y.axis').call(yAxis);

                    transition.select('.chart-label')
                        .text(label)
                        .attr('transform', 'translate(' + (width / 2) + ')');

                    transition.select('.line')
                        .attr('d', line(data));
                }
            }
        }
    };
});
