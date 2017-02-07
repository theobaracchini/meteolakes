angular.module('lakeViewApp').directive('dataChart', function($window) {
    return {
        restrict: 'E',
        scope: {
            setHandler: '&',
            spec: '=',
            label: '@',
            onClose: '&'
        },
        link: function(scope, element, attrs) {
            var container = element[0];
            var spec;
            var enableTransition = false;
            var content = d3.select(container).append('div');
            var scalePadding = 0.05; // Scale includes 5% above/below actual data range
            var margin = { top: 20, right: 20, bottom: 70, left: 40 };
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

            var line = d3.svg.line()
                .x(function(d) { return x(d.date); })
                .y(function(d) { return y(d.value); });

            var svg = content.append('svg')
                .style('width', '100%');

            var g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            g.append('g')
                .attr('class', 'chart-axis x');

            g.append('g')
                .attr('class', 'chart-axis y');

            var yLabel = g.append('text')
                    .attr('x', 10)
                    /* .attr('transform', 'rotate(-90)') */
                    .attr('y', 6)
                    .attr('dy', '.71em')
                    /* .style('text-anchor', 'end') */
                    .text('[Unit]');

            g.append('path')
                .attr('class', 'chart-data');

            // Run digest on window resize; this is required to detect container size changes
            angular.element($window).bind('resize', function() {
                scope.$apply();
            });

            // Update width and re-render on container size change
            scope.$watch(getContainerWidth, render);

            // watch for data changes and re-render
            scope.$watch('spec.columns[0].data', function() {
                if ('data' in scope.spec.columns[0]) {
                    spec = scope.spec;
                    render();
                }
            });

            function render() {
                if (spec) {
                    var xExtent = [];
                    var yExtent = [];
                    spec.columns.forEach(function(col) {
                        var plotXextent = d3.extent(col.data, function(d) { return d.date; });
                        var plotYextent = d3.extent(col.data, function(d) { return d.value; });
                        xExtent = xExtent.concat(plotXextent);
                        yExtent = yExtent.concat(plotYextent);
                    });
                    xExtent = d3.extent(xExtent);
                    yExtent = d3.extent(yExtent);
                    x.domain(xExtent);
                    var ySpace = scalePadding * (yExtent[0] - yExtent[1]);
                    yExtent[0] += ySpace; yExtent[1] -= ySpace;
                    y.domain(yExtent);
                    updateSize();
                    x.range([0, width]);
                    y.range([height, 0]);
                    xAxis.ticks(Math.max(width / 100, 2));
                    yAxis.ticks(Math.max(height / 50, 4));
                    // Use unit from plot definition, fall back to unit from sensor data
                    if ('unit' in spec) {
                        yLabel.text(spec.unit);
                    } else {
                        yLabel.text(spec.columns[0].unit);
                    }

                    var renderRoot = enableTransition ? g.transition() : g;

                    renderRoot.select('.chart-axis.x')
                        .attr('transform', 'translate(0,' + height + ')')
                        .call(xAxis);
                    renderRoot.select('.chart-axis.y').call(yAxis);

                    var colors = d3.scale.category10().range();
                    if (spec.columns.length > 10) {
                        // Support up to 20 lines per graph
                        colors = d3.scale.category20b().range();
                    }
                    var textX = 10;
                    var textY = height + (margin.bottom / 2) + 10;

                    renderRoot.selectAll('.chart-data').remove();
                    spec.columns.forEach(function(col, idx) {
                        if (spec.style === 'line' || spec.style === 'both') {
                            renderRoot.append('path')
                                .attr('class', 'chart-data chart-line')
                                .attr('d', line(col.data))
                                .style('stroke', colors[idx]);
                        }

                        if (spec.style === 'dots' || spec.style === 'both') {
                            col.data.forEach(function(dot) {
                                // Implement circles as zero-length lines in order
                                // to change radius by CSS in browsers without
                                // SVG2 support
                                renderRoot.append('line')
                                .attr('class', 'chart-data chart-circle')
                                .attr('x1', x(dot.date))
                                .attr('y1', y(dot.value))
                                .attr('x2', x(dot.date))
                                .attr('y2', y(dot.value))
                                .style('stroke', colors[idx]);
                            });
                        }

                        var t = renderRoot.append('text')
                            .attr('x', textX)
                            .attr('y', textY)
                            .attr('class', 'chart-data chart-legend')
                            .style('fill', colors[idx])
                            .text(col.title);
                        // SVG 1.1 compliant way of reading text width
                        var bbox = t[0][0].getBBox();
                        // Legend line full => start new line
                        if (textX + bbox.width > width) {
                            textY += 1.3 * bbox.height;
                            textX = 10;
                            t.attr('x', textX).attr('y', textY);
                        } else {
                            textX += bbox.width + 15;
                        }
                    });
                    margin.bottom = textY - height + 20;
                    svg.style('height', (height + margin.top + margin.bottom) + 'px');
                }
            }

            function getContainerWidth() {
                return svg.node().getBoundingClientRect().width;
            }

            function updateSize() {
                var w = getContainerWidth();

                if (w < 720) {
                    // Mobile: Set height to 75% of width
                    height = w * 0.75 - (margin.top + margin.bottom);
                    margin.left = 30;
                } else {
                    // Desktop: Set height to 40% of width
                    height = w * 0.4 - (margin.top + margin.bottom);
                    margin.left = 40;
                }
                g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
                width = w - (margin.left + margin.right);
            }
        }
    };
});
