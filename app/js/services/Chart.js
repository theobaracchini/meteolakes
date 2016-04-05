angular.module('lakeViewApp').service('Chart', function(DateHelpers) {
    var Chart = function($scope, Time, container, conversionFct) {
        this.$scope = $scope
        this.Time = Time
        this.container = container
        this.chartCanvas = this.prepareChart()
        this.fct = conversionFct

        this.Max(0).Min(0)
    }

    Chart.prototype.Max = function(m) { this.max = m; return this; }
    Chart.prototype.Min = function(m) { this.min = m; return this; }

    Chart.prototype.Close = function() {
        this.container.fadeOut()

        return this;
    }

    Chart.prototype.SelectPoint = function(pointData) {
        this.$scope.pointData = pointData
        this.UpdateChart()

        return this;
    }

    Chart.prototype.UpdateChart = function(dataTime) {
        if(!this.$scope.pointData)
            return this

        var p = this.$scope.pointData

        if(!p)
            return this;

        this.container.fadeIn()

        var svg = this.chartCanvas.svg
        var width = this.chartCanvas.width
        var height = this.chartCanvas.height

        var tx = d3.scale.linear()
            .domain([0, p.values.length])
            .range([0, width])
        // assign it here, because the 'this' pointer is changed
        // inside callbacks. This way we can use 'tx' below
        this.tx = tx

        var fct = this.fct
        var y = d3.scale.linear()
            .domain([this.min, this.max])
            .range([height, 0])
        
        var line = d3.svg.line()
            .interpolate('basis')
            .x(function(d, i) { return tx(i); })
            .y(function(d) { return y(fct(d)); });

        var plot = svg.selectAll('.plot').data([p])
        plot.exit().remove()

        plot.enter().append('path').attr('class', 'plot')
        plot
            .transition()
            .duration(500)
            .attr('d', function(d) { return line(d.values) })

        // svg axis
        var me = this;
        var xAxis = d3.svg.axis().scale(tx).ticks(4).tickFormat(function(d) { return me.formatTime(d)}).orient('top')
        var yAxis = d3.svg.axis().scale(y).ticks(4).orient('right');

        svg.select('.x.axis').call(xAxis)
        svg.select('.y.axis').call(yAxis)

        return this;
    }

    Chart.prototype.formatTime = function(d) {
        // TODO: simplify and fix date calculations
        var monday = DateHelpers.firstDayOfWeek(this.$scope.tData.DataTime.Week, this.$scope.tData.DataTime.Year).toDate();
        var hoursInAWeek = 7*24;
        var addedHours = d/this.Time.nT*hoursInAWeek;
        monday.setHours(monday.getHours() + addedHours);
        return monday.toDateString();
    }

    Chart.prototype.UpdateTimeLine = function() {
        if(this.tx)
            this.chartCanvas.svg.selectAll('.timeLine').attr('d', 'M' + this.tx(this.Time.tIndex) + ',' + 0 + ' L' + this.tx(this.Time.tIndex) + ',' + this.chartCanvas.height)

        return this;
    }

    Chart.prototype.prepareChart = function() {
        var me = this
        var drag = d3.behavior.drag().on('drag', function() { me.dragTime() })

        var chartCanvas = prepareCanvas(this.container.find('div')[0], 2);
        chartCanvas.svg.append('g')
            .attr('transform', 'translate(0,' + chartCanvas.height + ')')
            .attr('class', 'x axis')
        chartCanvas.svg.append('g')
            .attr('transform', 'translate(0,0)')
            .attr('class', 'y axis')
        chartCanvas.svg.append('rect')
            .attr('width', chartCanvas.width)
            .attr('height', chartCanvas.height)
            .attr('fill', 'none')
            .attr('pointer-events', 'visible')
            .call(drag)
        chartCanvas.svg.append('g')
            .append('path')
            .attr('class', 'timeLine')

        this.container.hide()

        return chartCanvas
    }

    Chart.prototype.dragTime = function() {
        this.Time.tIndex = parseInt(this.tx.invert(d3.event.x))
    }

    function prepareCanvas(containerId, aspectRatio) {
        var container = d3.select(containerId);

        var dim = findDimensions(container, aspectRatio);
        container.style('height', dim.height);

        return {
            svg: container.append('svg').attr('width', dim.width).attr('height', dim.height),
            width: dim.width,
            height: dim.height
        };
    }

    function findDimensions(container, aspectRatio) {
        var width = parseInt(container.style('width'));

        // adapt the height to fit the given width
        return { width: width, height: width / aspectRatio };
    }

    return Chart;
});
