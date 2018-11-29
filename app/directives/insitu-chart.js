angular.module('meteolakesApp').directive('insituChart', function($window) {
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
             // More colorblind friendly scale
            var COLORS_G = ['#3366cc', '#dc3912', '#ff9900', '#990099', '#0099c6', '#dd4477', '#b82e2e', '#316395', '#994499', '#22aa99'];

            var x = d3.time.scale();
            var y = d3.scale.linear();

            // x axis format: Show hours/minutes if nonzero, otherwise
            // show short month name and day of the month
            var format = d3.time.format.multi([
                ['%H:%M', function(d) { return d.getHours() || d.getMinutes(); }],
                ['%b %d', function() { return true; }]
            ]);

            var bisectDate = d3.bisector(function(d) { return d.date; }).left,
                formatValue = d3.format(",.1f");

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

            function make_x_axis() {
                return d3.svg.axis()
                    .scale(x)
                     .orient("bottom")
                     .ticks(Math.max(width / 100, 2))
            }

            function make_y_axis() {
                return d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .ticks(Math.max(height / 50, 4))
            }

            var svg = content.append('svg')
                .style('width', '100%');

            var g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            g.append('g')
                .attr('class', 'chart-axis x');

            g.append('g')
                .attr('class', 'chart-axis y');

            g.append("g")
                .attr("class", "grid x")
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .call(make_x_axis()
                    .tickSize(-height, 0, 0)
                    .tickFormat("")
                );

            g.append("g")
                .attr("class", "grid y")
                .call(make_y_axis()
                    .tickSize(-width, 0, 0)
                    .tickFormat("")
                );

            var yLabel = g.append('text')
                    .attr('x', 10)
                    /* .attr('transform', 'rotate(-90)') */
                    .attr('y', 6)
                    .attr('dy', '.71em')
                    /* .style('text-anchor', 'end') */
                    .text('[Unit]');

            g.append('path')
                .attr('class', 'chart-data')

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
                        var formatUnit = function(d) { return formatValue(d) + " " + spec.unit; };
                    } else {
                        yLabel.text(spec.columns[0].unit);
                        var formatUnit = function(d) { return formatValue(d) + " " + spec.columns[0].unit; };
                    }

                    var renderRoot = enableTransition ? g.transition() : g;

                    renderRoot.select('.chart-axis.x')
                        .attr('transform', 'translate(0,' + height + ')')
                        .call(xAxis);
                    renderRoot.select('.chart-axis.y')
                        .call(yAxis);

                    renderRoot.select('.grid.x')
                        .attr("transform", "translate(0," + height + ")")
                        .call(make_x_axis()
                        .tickSize(-height, 0, 0)
                        .tickFormat(""));

                    renderRoot.select('.grid.y')
                        .call(make_y_axis()
                        .tickSize(-width, 0, 0)
                        .tickFormat(""));

                    var colors = COLORS_G;
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

                        // We're passing in a function in d3.max to tell it what we're maxing (x value)
                        var xScale = d3.time.scale()
                            .domain(xExtent)
                            .range([margin.left, width - margin.right]);  // Set margins for x specific

                        // We're passing in a function in d3.max to tell it what we're maxing (y value)
                        var yScale = d3.scale.linear()
                            .domain(yExtent)
                            .range([margin.top, height - margin.bottom]);  // Set margins for y specific

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
                        }
                        textX += bbox.width + 15;
                    });

                    // Display values when mouse hovering
                    var hoverBox = g.append("g")
                    hoverBox.append("rect")
                          .attr('transform', 'translate(' + 0 + ',' + 0 + ')')
                          //.style("display", "none");

                    var focus = g.append("g")
                          .attr("class", "focus")
                          .style("display", "none");

                    focus.append("circle")
                        .attr("r", 4.5);

                    focus.append("text")
                        .attr("x", 9)
                        .attr("dy", "-0.35em");

                    // Mouse hovering popup
                    function mousemove() {
                      var x0 = x.invert(d3.mouse(this)[0]);

                      var col = spec.columns[0].data,
                          i = bisectDate(col, x0, 1),
                          colInd = x0 - col[i-1].date > col[i].date - x0 ? i : i-1;

                      var backShift;
                      if (x(col[spec.columns[0].data.length-1].date) - x(col[colInd].date) < 100){
                        backShift = -104;
                      }  else {
                        backShift = 8;
                      }

                      // TODO: multiple hover bubbles when multiple lines
                      focus.attr("transform", "translate(" + x(col[colInd].date) +"," + y(col[colInd].value) + ")");

                      focus.select("text")
                          .attr("x", backShift+1)
                          .text(formatUnit(col[colInd].value))
                          .append('svg:tspan')
                          .attr("x", backShift+1)
                          .attr("dy", "1.35em")
                          .text(col[colInd].date.format("DD-MMM HH:mm"));

                      hoverBox.select("rect")
                        .attr("x", x(col[colInd].date)+backShift) // Fixed shift
                        .attr("y", y(col[colInd].value)-17) // Fixed shift
                        .attr("width", 95) // Fixed size for now
                        .attr("height", 35) // Fixed size for now
                        .style("opacity", 0.6)
                        .style("fill","steelblue");
                    }

                    g.append("rect")
                        .attr("class", "overlay")
                        .attr("width", width)
                        .attr("height", height)
                        .on("mouseover", function() {
                          hoverBox.style("opacity", 1);
                          focus.style("display", null);
                          })
                        .on("mouseout", function() {
                            focus.style("display", "none");
                            hoverBox.style("opacity", "0");
                          })
                        .on("mousemove", mousemove);

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
                    margin.left = 40;
                } else {
                    // Desktop: Set height to 40% of width
                    height = w * 0.4 - (margin.top + margin.bottom);
                    margin.left = 50;
                }
                g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
                width = w - (margin.left + margin.right);
            }
        }
    };
});
