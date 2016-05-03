angular.module('lakeViewApp').directive('d3Chart', function($window) {
    return {
        restrict: 'E',
        scope: {
            'setHandler': '&',
            data: '=',
            label: '@',
            onClose: '&'
        },
        link: function(scope, element, attrs) {
            var container = element[0];
            var data;
            var step = 0;
            var label;
            var enableTransition = false;

            var placeholder = d3.select(container).append('div');

            placeholder
                .append('div')
                .attr('class', 'alert alert-info')
                .text('Click on the map to show a time series for that point.');

            var content = d3.select(container).append('div');

            content
                .append('div')
                .attr('class', 'close')
                .html('&times;')
                .on('click', function() {
                    scope.onClose();
                    scope.$apply();
                });

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

            var svg = content.append('svg')
                .style('width', '100%')
                .attr('height', height + margin.top + margin.bottom)

            var g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            g.append('g')
                .attr('class', 'chart-axis x')
                .attr('transform', 'translate(0,' + height + ')');

            g.append('g')
                .attr('class', 'chart-axis y')
                .append('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', 6)
                    .attr('dy', '.71em')
                    .style('text-anchor', 'end')
                    .text(scope.label);

            g.append('text')
                .attr('class', 'chart-label')
                .attr('text-anchor', 'middle');

            g.append('path')
                .attr('class', 'chart-data');

            g.append('line')
                .attr('class', 'chart-vertical-line')
                .attr("x1", 10).attr("x2", 10)
                .attr("y1", 0).attr("y2", height);

            scope.setHandler({handler: function(newStep) {
                step = newStep;
                render();
            }});

            // Run digest on window resize; this is required to detect container size changes
            angular.element($window).bind('resize', function() {
                scope.$apply();
            });
            // Update width and re-render on container size change
            scope.$watch(getContainerWidth, render);

            // watch for data changes and re-render
            scope.$watch('data', function(values, oldValues) {
                if (values) {
                    if (!oldValues) {
                        // Disable transition when rendering the first time after chart has been hidden
                        enableTransition = false;
                    }
                    data = values.data;
                    label = 'Location: ' + values.x + ' / ' + values.y;
                    x.domain(d3.extent(data, function(d) { return d.date; }));
                    y.domain(d3.extent(data, function(d) { return d.value; }));
                    show();
                    render();
                } else {
                    hide();
                }
            });

            function render() {
                if (data) {
                    updateWidth();
                    x.range([0, width]);

                    var renderRoot = enableTransition ? svg.transition() : svg;
                    enableTransition = true;

                    renderRoot.select('.chart-axis.x').call(xAxis);
                    renderRoot.select('.chart-axis.y').call(yAxis);

                    renderRoot.select('.chart-label')
                        .text(label)
                        .attr('transform', 'translate(' + (width / 2) + ')');

                    renderRoot.select('.chart-data')
                        .attr('d', line(data));

                    var linePosition = x(data[step].date);
                    renderRoot.select('.chart-vertical-line')
                        .attr("x1", linePosition)
                        .attr("x2", linePosition);
                }
            }

            function getContainerWidth() {
                return container.offsetWidth;
            }

            function updateWidth() {
                width = getContainerWidth() - (margin.left + margin.right);
            }

            function show() {
                placeholder.attr('class', 'hidden');
                content.attr('class', null);
            }

            function hide() {
                placeholder.attr('class', null);
                content.attr('class', 'hidden');
            }
        }
    };
});
