angular.module('meteolakesApp').directive('d3Chart', function($window) {
    return {
        restrict: 'E',
        scope: {
            setHandler: '&',
            data: '=',
            label: '=',
            placeholder: '=',
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
                .append('ol')
                .attr('class', 'breadcrumb')
                .append('li')
                .attr('class', 'active')
                .text(scope.placeholder);

            scope.$watch('placeholder', function(newVal, oldVal) {
                $(placeholder[0][0]).children('ol').children('li').text(newVal);
            });

            var content = d3.select(container).append('div');
            content
                .append('div')
                .attr('class', 'close')
                .html('&times;')
                .on('click', function() {
                    scope.onClose();
                    scope.$apply();
                });

            var margin = { top: 20, right: 20, bottom: 30, left: 50 };
            var width = 0;
            var height = 0;

            var x = d3.time.scale();

            var y = d3.scale.linear();

            // x axis format: Show hours/minutes if nonzero, otherwise
            // show short month name and day of the month
            var format = d3.time.format.multi([
                ['%H:%M', function(d) { return d.getHours() || d.getMinutes(); }],
                ['%b %d', function() { return true; }]
            ]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickFormat(format);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left');

            var area = d3.svg.area()
                .interpolate('monotone')
                .x(function(d) { return x(d.date) || 1; })
                .y0(function(d) { return y(d.max_value); })
                .y1(function(d) { return y(d.min_value); });

            var line = d3.svg.line()
                .interpolate('monotone')
                .x(function(d) { return x(d.date); })
                .y(function(d) { return y(d.value); });

            var svg = content.append('svg')
                .style('width', '100%');

            var g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            g.append('g')
                .attr('class', 'chart-axis x');

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
                .attr('class', 'chart-area');

            g.append('path')
                .attr('class', 'chart-line');

            g.append('line')
                .attr('class', 'chart-vertical-line');

            scope.setHandler({ handler: function(newStep) {
                step = newStep;
                render();
            } });

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
                        // Disable transition when rendering the first
                        // time after chart has been hidden
                        enableTransition = false;
                    }
                    data = values.data;
                    // Don't display the surface elevation as it is not properly defined
                    if (values.z) {
                        label = 'Location: ' + values.x + ' / ' + values.y + ' / ' + d3.round(values.z, 1) + ' m';
                    } else {
                        label = 'Location: ' + values.x + ' / ' + values.y + ' m';
                    }
                    x.domain(d3.extent(data, function(d) { return d.date; }));
                    if (data[0].min_value && data[0].max_value) {
                        y.domain([
                            d3.min(data, function(d) { return Math.max(0, (isNaN(d.min_value) ? d.value : d.min_value) - 0); }),
                            d3.max(data, function(d) { return (isNaN(d.max_value) ? d.value : d.max_value) + 0; }) // TODO fine tuning
                        ]);
                    } else {
                        y.domain(d3.extent(data, function(d) { return d.value + 0; }));
                    }
                    show();
                    render();
                } else {
                    hide();
                }
            });

            function render() {
                if (data) {
                    updateSize();
                    x.range([0, width]);
                    y.range([height, 0]);
                    xAxis.ticks(width / 80);
                    yAxis.ticks(height / 50);

                    svg.style('height', (height + margin.top + margin.bottom) + 'px');

                    var renderRoot = enableTransition ? svg.transition() : svg;
                    enableTransition = true;

                    renderRoot.select('.chart-axis.x')
                        .attr('transform', 'translate(0,' + height + ')')
                        .call(xAxis);
                    renderRoot.select('.chart-axis.y').call(yAxis);

                    renderRoot.select('.chart-label')
                        .text(label)
                        .attr('transform', 'translate(' + (width / 2) + ')');

                    if (data[0].min_value && data[0].max_value) {
                        renderRoot.select('.chart-area')
                            .attr('d', area(data.filter(d => !isNaN(d.min_value) && !isNaN(d.max_value))));
                    } else {
                        renderRoot.select('.chart-area')
                            .attr('d', null);
                    }

                    renderRoot.select('.chart-line')
                        .attr('d', line(data));

                    var linePosition = x(data[step].date);
                    renderRoot.select('.chart-vertical-line')
                        .attr('x1', linePosition)
                        .attr('x2', linePosition)
                        .attr('y1', 0)
                        .attr('y2', height);
                }
            }

            function getContainerWidth() {
                return svg.node().getBoundingClientRect().width;
            }

            function updateSize() {
                var w = getContainerWidth();
                width = w - (margin.left + margin.right);
                // set height to 66% of width
                height = w * 0.66 - (margin.top + margin.bottom);
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
