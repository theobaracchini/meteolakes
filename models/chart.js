var Chart = function($scope, Time, containerId, conversionFct) {
    this.$scope = $scope
    this.Time = Time
    this.containerId = containerId
    this.chartCanvas = this.prepareChart()
    this.fct = conversionFct

    this.Max(0).Min(0)
}

Chart.prototype.Max = function(m) { this.max = m; return this; }
Chart.prototype.Min = function(m) { this.min = m; return this; }

Chart.prototype.Close = function() {
    $(this.containerId).fadeOut()
    this.$scope.pointIndex = undefined

    return this;
}

Chart.prototype.SelectPoint = function(i) {
	this.$scope.pointIndex = i
	this.UpdateChart()

    return this;
}

Chart.prototype.UpdateChart = function() {
	if(!this.$scope.pointIndex)
		return this

	var p = this.$scope.tData.Data[this.$scope.pointIndex]

	if(!p)
		return this

	$(this.containerId).fadeIn()

	var svg = this.chartCanvas.svg
	var width = this.chartCanvas.width
	var height = this.chartCanvas.height

	var tx = d3.scale.linear()
		.domain([0, p.value.length])
		.range([0, width])
    // assign it here, because the 'this' pointer is changed
    // inside callbacks. This way we can use 'tx' below
    this.tx = tx

    var fct = this.fct
	var y = d3.scale.linear()
		.domain([this.min, this.max])
		.range([height, 0])
    
	var line = d3.svg.line()
	    .interpolate("basis")
	    .x(function(d, i) { return tx(i); })
	    .y(function(d) { return y(fct(d)); });

	var plot = svg.selectAll(".plot").data([p])
	plot.exit().remove()

	plot.enter().append("path").attr("class", "plot")
	plot
		.transition()
		.duration(500)
		.attr("d", function(d) { return line(d.value) })

	// svg axis
	var xAxis = d3.svg.axis().scale(tx).ticks(4).orient("top")
    var yAxis = d3.svg.axis().scale(y).ticks(4).orient("right");

    svg.select(".x.axis").call(xAxis)
    svg.select(".y.axis").call(yAxis)

    return this;
}

Chart.prototype.UpdateTimeLine = function() {
    if(this.tx)
        this.chartCanvas.svg.selectAll(".timeLine").attr("d", "M" + this.tx(this.Time.tIndex) + "," + 0 + " L" + this.tx(this.Time.tIndex) + "," + this.chartCanvas.height)

    return this;
}

Chart.prototype.prepareChart = function() {
    var me = this
    var drag = d3.behavior.drag().on("drag", function() { me.dragTime() })

    var chartCanvas = PrepareSvgCanvas(this.containerId + " div", 2)
    chartCanvas.svg.append("g")
        .attr("transform", "translate(0," + chartCanvas.height + ")")
        .attr("class", "x axis")
    chartCanvas.svg.append("g")
        .attr("transform", "translate(0,0)")
        .attr("class", "y axis")
    chartCanvas.svg.append("rect")
        .attr("width", chartCanvas.width)
        .attr("height", chartCanvas.height)
        .attr("fill", "none")
        .attr("pointer-events", "visible")
        .call(drag)
    chartCanvas.svg.append("g")
        .append("path")
        .attr("class", "timeLine")

    $(this.containerId).hide()

    return chartCanvas
}

Chart.prototype.dragTime = function() {
    this.Time.tIndex = parseInt(this.tx.invert(d3.event.x))
}