// Interval (in minutes) between 2 data points
var INTERVAL = 180;

var DATA_HOST = "http://aphyspc1.epfl.ch/meteolac/";
 
// Get the week number for the created date
function GetWeek(date) {
    var onejan = new Date(date.getFullYear(),0,1);
    return Math.ceil((((date - onejan) / 86400000) + onejan.getDay()+1)/7);
} 

function FirstDayOfWeek(week, year) { 

    if (year==null) {
        year = (new Date()).getFullYear();
    }

    var date       = firstWeekOfYear(year),
        weekTime   = weeksToMilliseconds(week),
        targetTime = date.getTime() + weekTime;

    return date.setTime(targetTime); 

}

function LastDayOfWeek(week, year) { 

    if (year==null) {
        year = (new Date()).getFullYear();
    }

    var date       = firstWeekOfYear(year),
        weekTime   = weeksToMilliseconds(week+1)-1,
        targetTime = date.getTime() + weekTime;

    return date.setTime(targetTime); 

}

function weeksToMilliseconds(weeks) {
    return 1000 * 60 * 60 * 24 * 7 * (weeks - 1);
}

function firstWeekOfYear(year) {
    var date = new Date();
    date = firstDayOfYear(date,year);
    date = firstWeekday(date);
    return date;
}

function firstDayOfYear(date, year) {
    date.setYear(year);
    date.setDate(1);
    date.setMonth(0);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

/**
 * Sets the given date as the first day of week of the first week of year.
 */
function firstWeekday(firstOfJanuaryDate) {
    // 0 correspond au dimanche et 6 correspond au samedi.
    var FIRST_DAY_OF_WEEK = 1; // Monday, according to iso8601
    var WEEK_LENGTH = 7; // 7 days per week
    var day = firstOfJanuaryDate.getDay();
    day = (day === 0) ? 7 : day; // make the days monday-sunday equals to 1-7 instead of 0-6
    var dayOffset=-day+FIRST_DAY_OF_WEEK; // dayOffset will correct the date in order to get a Monday
    if (WEEK_LENGTH-day+1<4) {
        // the current week has not the minimum 4 days required by iso 8601 => add one week
        dayOffset += WEEK_LENGTH;
    }
    return new Date(firstOfJanuaryDate.getTime()+dayOffset*24*60*60*1000);
}

/**
 * Returns the number of weeks in the given year
 */
function NumberOfWeeks(year) {
    var dec31 = new Date(year,11, 31);
    return GetWeek(dec31);
} 
var TemporalData = function(valuesFile, numberOfValues, numberOfTimesteps, callback) {
	var me = this;
	this.numberOfValues = numberOfValues;
	this.gridWidth = 182;
	this.gridHeight = 36;
	this.nT = numberOfTimesteps;

	// Empty array used when the data is not available
	this.PrepareFallbackArray();
	
	// Read the initial data
	this.readArray(valuesFile, function(arr) { 
		me.Data = arr;
		callback();
	});
}

TemporalData.prototype.PrepareFallbackArray = function() {
	var fallback = [];
	var vals = [];
	for(var t = 0 ; t < this.nT ; ++t) {
		var data = [];
		for(var i = 0 ; i < this.numberOfValues ; ++i) {
			data.push(0);
		}
		if(this.numberOfValues == 1)
			vals.push(data[0]);
		else
			vals.push(data);
	}

    for(var i = 0 ; i < this.gridWidth*this.gridHeight ; ++i) {
    	var v =
    		{
    			x:0,
    			y:0,
    			value:vals
    		};
    	fallback.push(v);
    }

    this.fallBackArray = fallback;
}

TemporalData.prototype.PrepareNextFiles = function(valuesFile) {
	var me = this;
	this.readArray(valuesFile, function(arr) { 
		me.NextData = arr;
	});

	return this;
}

TemporalData.prototype.X = function(arr, index) {
	var idx = this.gridHeight*(2+this.numberOfValues*this.nT)*parseInt(index/this.gridHeight) + (index % this.gridHeight);
	return arr[idx];
}

TemporalData.prototype.Y = function(arr, index) {
	var idx = this.gridHeight*(2+this.numberOfValues*this.nT)*parseInt(index/this.gridHeight) + (index % this.gridHeight) + this.gridHeight;
	return arr[idx];
}

TemporalData.prototype.V = function(arr, index) {
	var from = this.gridHeight*(2+this.numberOfValues*this.nT)*parseInt(index/this.gridHeight) + (index % this.gridHeight) + 2*this.gridHeight;

	var vals = [];
	for(var t = 0 ; t < this.nT ; ++t) {
		var data = [];
		for(var i = 0 ; i < this.numberOfValues ; ++i) {
			var idx = from + i*this.nT*this.gridHeight + t*this.gridHeight;
			data.push(arr[idx]);
		}
		if(this.numberOfValues == 1)
			vals.push(data[0]);
		else
			vals.push(data);
	}

	return vals;
}

TemporalData.prototype.SwitchToNextData = function() {
	if(this.HasNextData()) {
		// free memory
		this.Data = null;
		this.Data = this.NextData;
		this.NextData = null;
	}

	return this;
}

TemporalData.prototype.readArray = function(file, callback) {
	var me = this;
	d3.text(file, function(err, data) {
		if(err) {
			console.log("File not found (" + file + ") falling back to default array");
			callback(me.fallBackArray);
			return;
		}
        // split data at line breaks and commas and parse the numbers
        var arr =  data.split(/[,\n]/).map(function(d) { return parseFloat(d); });
        var res = [];
        for(var i = 0 ; i < me.gridWidth*me.gridHeight ; ++i) {
        	var v =
        		{
        			x:me.X(arr, i),
        			y:me.Y(arr, i),
        			value:me.V(arr, i)
        		};
        	res.push(v);
        }

        me.recomputeBounds(res);

		callback(res);
	})

	return this;
}

TemporalData.prototype.recomputeBounds = function(res) {
	this.xMin = d3.min(res.map(function(t) { return t.x }));
	this.xMax = d3.max(res.map(function(t) { return t.x }));

	this.yMin = d3.min(res.map(function(t) { return t.y }));
	this.yMax = d3.max(res.map(function(t) { return t.y }));

	return this;
}

TemporalData.prototype.HasNextData = function() { return this.NextData != null; }
 
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
var Particle = function(xOrigin, yOrigin, particleSize) {
	this.lifespan = 0;
	this._graphic = circle(xOrigin, yOrigin, particleSize, 0x0);
	this._origin = {x:xOrigin, y:yOrigin};
}

Particle.prototype.Tick = function(dT) {
	if(this.lifespan <= 0) {
		this.lifespan = 0;
		return;
	}

	this.lifespan -= dT;

	// Hide the particle if it is asleep
	this._graphic.sprite.visible = this.lifespan > 0;

	if(this.opacityAxis)
		this._graphic.sprite.alpha = this.opacityAxis(this.lifespan);

	this.move(this._xVel*dT, this._yVel*dT);
}

Particle.prototype.Shoot = function(xVel, yVel, lifespan) {
	this.lifespan = lifespan;
	this._xVel = xVel;
	this._yVel = yVel;
	this._graphic.graphic.position.x = this._origin.x;
	this._graphic.graphic.position.y = this._origin.y;

	if(!this.opacityAxis)
		this.opacityAxis = d3.scale.linear().domain([0, lifespan]).range([0, 1]);

	return this;
}

Particle.prototype.SetRenderer = function(stage) {
    stage.addChild(this._graphic.graphic);

    return this;
}

Particle.prototype.EnableInteractivity = function(mousedown, mouseover, mouseup) {
    this._graphic.sprite.interactive = true;
    this._graphic.sprite.mousedown = mousedown;
    this._graphic.sprite.mouseover = mouseover;
    this._graphic.sprite.mouseup = mouseup;
}

Particle.prototype.SetColor = function(color) {
	this._graphic.sprite.tint = color;

	return this;
}

Particle.prototype.move = function(dX, dY) {
	this._graphic.graphic.position.x += dX;
	this._graphic.graphic.position.y += dY;

	return this;
} 
var ParticleEmitter = function(xPos, yPos, particleSize, lifespan, maxParticles) {
	// Default values for parameters
	lifespan = typeof lifespan !== 'undefined' ? lifespan : 0.5;
	maxParticles = typeof maxParticles !== 'undefined' ? maxParticles : 4;

	this._particles = [];
	for(var i = 0 ; i < maxParticles ; ++i)
		this._particles.push(new Particle(xPos, yPos, particleSize));
	this._particleLifespan = lifespan;
	this._nextParticleIdx = 0;
}

ParticleEmitter.prototype.Tick = function(dT) {
	for(var i = this._particles.length - 1 ; i >= 0 ; --i) {
		this._particles[i].Tick(dT);
	}
}

ParticleEmitter.prototype.SetRenderer = function(stage) {
	for(var i = 0 ; i < this._particles.length ; ++i)
		this._particles[i].SetRenderer(stage);
}

ParticleEmitter.prototype.EnableParticleInteractivity = function(mousedown, mouseover, mouseup) {
	for(var i = 0 ; i < this._particles.length ; ++i)
		this._particles[i].EnableInteractivity(mousedown, mouseover, mouseup);
}

ParticleEmitter.prototype.Emit = function(xVel, yVel, color) {
	var p = this.getFreeParticle();

	if(p == null) return;

	p.Shoot(xVel, yVel, this._particleLifespan)
		.SetColor(color);
}

ParticleEmitter.prototype.getFreeParticle = function() {
	var p = this._particles[this._nextParticleIdx];
	this._nextParticleIdx = (this._nextParticleIdx + 1 ) % this._particles.length;
	return p;
}
 
var app = angular.module("app", []);

// Factory for a shared time index variable, so that all 
// graphs can access it
app.factory("Time", function() {

    return { 
        tIndex: 0,
        nT: 24*7/3, // number of time steps in a week  
        increase: function(loop) {
            if(loop) {
                this.tIndex ++;
                if(this.tIndex >= this.nT)
                    this.tIndex = 0;
            } else
                this.tIndex = Math.min(this.nT-1, this.tIndex+1);
        },
        decrease: function() {
            this.tIndex = Math.max(0, this.tIndex-1);
        }

    };
})

function PrepareCanvas(containerId, aspectRatio) {
	return Prepare("canvas", containerId, aspectRatio);
}

function PrepareSvgCanvas(containerId, aspectRatio) {
	return Prepare("svg", containerId, aspectRatio);
}

function PrepareWebGLContext(containerId, interactive, aspectRatio) {
    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(0xFFFFFF, interactive);

    // create a renderer instance.
    var container = d3.select(containerId);

    var dim = findDimensions(container, 2);
    var width = dim.width;
    var height = dim.height;
    var renderer = PIXI.autoDetectRenderer(width, height);

    // add the renderer view element to the DOM
    container.style("height", height).node().appendChild(renderer.view);

    return {stage:stage, renderer:renderer, width:width, height:height};
}

function Prepare(type, containerId, aspectRatio) {
	var container = d3.select(containerId);

    var dim = findDimensions(container, aspectRatio);
    container.style("height", dim.height);

	return {svg:container.append(type).attr("width", dim.width).attr("height", dim.height), width:dim.width, height:dim.height};
}

function findDimensions(container, aspectRatio) {
	var width = parseInt(container.style("width"));

    // adapt the height to fit the given width
    return {width:width, height:width/aspectRatio};
}

function zip(arrays) {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]});
    });
}

// taken from http://www.html5gamedevs.com/topic/3114-question-about-rectangle-drawing/
function rectangle(x, y, width, height, backgroundColor) { 
    var box = new PIXI.DisplayObjectContainer();
    var background = new PIXI.Sprite(getRectTexture(0xFFFFFF));
    background.tint = backgroundColor;
    background.width = width;
    background.height = height;
    background.position.x = 0;
    background.position.y = 0;
    box.addChild(background);
    box.position.x = x;
    box.position.y = y;
    return {graphic:box, sprite:background};
};

function circle(x, y, radius, backgroundColor) { 
    var box = new PIXI.DisplayObjectContainer();
    var background = new PIXI.Sprite.fromImage("/files/content/sites/aphys/files/MeteoLac/dot.png");//(getCircleTexture(0xFFFFFF));
    background.tint = backgroundColor;
    background.width = radius*2;
    background.height = radius*2;
    background.position.x = 0;
    background.position.y = 0;
    box.addChild(background);
    box.position.x = x - radius/2;
    box.position.y = y - radius/2;
    return {graphic:box, sprite:background};
};

var rectColorTextures = {};
function getRectTexture(color) {
    if(rectColorTextures[color] === undefined) {
        var canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + color.toString(16);
        ctx.beginPath();
        ctx.rect(0,0,1,1);
        ctx.fill();
        ctx.closePath();
        rectColorTextures[color] = PIXI.Texture.fromCanvas(canvas);
    }
    return rectColorTextures[color];
};

var circleColorTextures = {};
function getCircleTexture(color) {
    if(circleColorTextures[color] === undefined) {
        var canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + color.toString(16);
        ctx.beginPath();
        ctx.arc(0,0,1,0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();
        circleColorTextures[color] = PIXI.Texture.fromCanvas(canvas);
    }
    return circleColorTextures[color];
}; 
app.controller("temperatureCtrl", ["$rootScope", "$scope", "Time", function($rootScope, $scope, Time) {

	// ========================================================================
	// PROPERTIES
	// ========================================================================

	var webgl = PrepareWebGLContext("#tempContainer", true, 2);
	var width = webgl.width;
	var height = webgl.height;
	var stage = webgl.stage;
	var renderer = webgl.renderer;
	var markerSprite;
	var sprites = [];

	var isDataReady = false;

	var x,y,c; // d3 axis
	var rectSize;

	var colorLegend = prepareLegend();

	var mouseDown = false;

	Initialize();

	// ========================================================================
	// INIT (I know, code above is also some initialization. Deal with it.)
	// ========================================================================
	function Initialize() {
		$rootScope.$on("reloadWeek", function(evt, time) {
			isDataReady = false;

			var currentFilename = DATA_HOST + "data/" + time.year + "/temperature/data_week" + time.week + ".csv";
			var nextFilename = DATA_HOST + "data/" + time.year + "/temperature/data_week" + (time.week+1) + ".csv";

			if($scope.tData && $scope.tData.HasNextData() && !time.fullReload) {
				// If we have already loaded the next values file, swap it and load the one after that
				$scope.tData.SwitchToNextData().PrepareNextFiles(nextFilename);

				dataReady();
			} else {
				// First time initialization
				$scope.tData = new TemporalData(currentFilename, 1, 7*24*60/INTERVAL, function() {
					dataReady();
					prepareGraphics();

					// Load the next file
			    	$scope.tData.PrepareNextFiles(nextFilename);
				})
			}
		})

		$scope.Chart = new Chart($scope, Time, "#tempPlot", function(d) { return d })
		$rootScope.$on("reloadChart", function(evt, pointIndex) {
			$scope.Chart.SelectPoint(pointIndex);
		})

		// start the renderer
		d3.timer(animate);

		$rootScope.$emit("scopeReady");		
	}

	// ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

	function dataReady() {
	    var xmargin = width*0.1;
	    var ymargin = height*0.1;
	    x = d3.scale.linear().domain([$scope.tData.xMin, $scope.tData.xMax]).range([0+xmargin, width-xmargin]);
	    y = d3.scale.linear().domain([$scope.tData.yMin, $scope.tData.yMax]).range([height-ymargin, 0+ymargin]);

	    var tMin = d3.min($scope.tData.Data.map(function(d) { return d3.min(d.value) }));
	    var tMax = d3.max($scope.tData.Data.map(function(d) { return d3.max(d.value) }));

	    c = d3.scale.linear().domain([tMin, (tMin+tMax)/2, tMax]).range(["blue", "lime", "red"]);

	    // Prepare all thingies
	    updateLegend(tMin, tMax);
	    $scope.Chart.UpdateChart().Max(tMax).Min(tMin);

	    isDataReady = true;
	}

	function prepareGraphics() {
	    var rectSize = x(700) - x(0);

	    // Clear the stage
	    for (var i = stage.children.length - 1; i >= 0; i--) {
			stage.removeChild(stage.children[i]);
		};

	    $scope.tData.Data.forEach(function(d, i) {
	        var doc = rectangle(x(d.x)-rectSize/2, y(d.y)-rectSize/2,
	            rectSize,rectSize,
	            parseInt(c(d.value[Time.tIndex]).toString().replace("#", "0x")));
	        stage.addChild(doc.graphic);
	        sprites[i] = doc;
	        sprites[i].sprite.interactive = true;
	        sprites[i].sprite.mousedown = function(mouseData) { $rootScope.$emit("reloadChart", i); mouseDown = true; }
	        sprites[i].sprite.mouseover = function(mouseData) { if(!mouseDown) return; $rootScope.$emit("reloadChart", i); }
	        sprites[i].sprite.mouseup = function(mouseData) { mouseDown = false; }
	    })

	    // Prepare the marker symbol
	    markerSprite = new PIXI.Sprite.fromImage("/files/content/sites/aphys/files/MeteoLac/marker.png");
	    markerSprite.width = 50;
	    markerSprite.height = 50;
	    stage.addChild(markerSprite);
	    markerSprite.visible = false;    
	}

	function prepareLegend() {
		var w = 300, h = 120;
		key = d3.select("#tempLegend").append("svg").attr("id", "key").attr("width", w).attr("height", h);
		legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
		legend.append("stop").attr("offset", "0%").attr("stop-color", "blue").attr("stop-opacity", 1);
		legend.append("stop").attr("offset", "50%").attr("stop-color", "lime").attr("stop-opacity", 1);
		legend.append("stop").attr("offset", "100%").attr("stop-color", "red").attr("stop-opacity", 1);
		key.append("rect").attr("width", w - 100).attr("height", h - 100).style("fill", "url(#gradient)")
		var color = key.append("g").attr("class", "x axis").attr("transform", "translate(0,22)");
		color.append("text").attr("y", 42).attr("dx", ".71em").style("text-anchor", "start").text("Temperature (°C)");
		return color;
	}

	function updateLegend(tMin, tMax) {
		var x = d3.scale.linear().range([0, 200]).domain([tMin, tMax]);
		var xAxis = d3.svg.axis().scale(x).ticks(4).orient("bottom");
		colorLegend.call(xAxis);
	}

	function animate() {
		if(!isDataReady) return;

		// Protect against out-of-bounds ex
		if(Time.tIndex >= $scope.tData.nT) return;

	    // Animate the stuff here (transitions, color updates etc.)
		var rectSize = x(700) - x(0);
	    $scope.tData.Data.forEach(function(d, i) {
	        var value = d.value[Time.tIndex];
	        sprites[i].sprite.visible = !isNaN(d.value[Time.tIndex]);
	        sprites[i].graphic.position.x = x(d.x)-rectSize/2;
	        sprites[i].graphic.position.y = y(d.y)-rectSize/2;
	        sprites[i].sprite.width = rectSize;
	        sprites[i].sprite.height = rectSize;
     	   	var color = parseInt(c(value).toString().replace("#", "0x"));
			sprites[i].sprite.tint = color;
	    })

	    // Put the marker sprite at the correct position
	    markerSprite.visible = $scope.pointIndex != undefined;
	    if($scope.pointIndex != undefined) {
	    	markerSprite.position.x = x($scope.tData.Data[$scope.pointIndex].x) - markerSprite.width / 2;
	    	markerSprite.position.y = y($scope.tData.Data[$scope.pointIndex].y) - markerSprite.height / 2;
	    }

	    // render the stage
	    renderer.render(stage);

	    // render the timeline on the chart
	    $scope.Chart.UpdateTimeLine();
	}
}]); 
app.controller("velocityCtrl", ["$rootScope", "$scope", "Time", function($rootScope, $scope, Time) {

	// ========================================================================
	// PROPERTIES
	// ========================================================================

	var webgl = PrepareWebGLContext("#velContainer", true, 2);
	var width = webgl.width;
	var height = webgl.height;
	var stage = webgl.stage;
	var renderer = webgl.renderer;
	var markerSprite;

	var isDataReady = false;

    var x,y,c; // d3 axis (x,y, color)
	var rectSize;
	var particleSystems = [];

    var colorLegend = prepareLegend();

	var mouseDown = false;
	
	Initialize();

	// ========================================================================
	// INIT (I know, code above is also initialization. Deal with it.)
	// ========================================================================
	function Initialize() {
		$rootScope.$on("reloadWeek", function(evt, time) {
			isDataReady = false;

			var currentFilename = DATA_HOST + "data/" + time.year + "/velocity/data_week" + time.week + ".csv";
			var nextFilename = DATA_HOST + "data/" + time.year + "/velocity/data_week" + (time.week+1) + ".csv";

			if($scope.tData && $scope.tData.HasNextData() && !time.fullReload) {
				// If we have already loaded the next values file, swap it and load the one after that
				$scope.tData.SwitchToNextData().PrepareNextFiles(nextFilename);

				dataReady();
			} else {
				// First time initialization
				$scope.tData = new TemporalData(currentFilename, 2, 7*24*60/INTERVAL, function() {
					dataReady();
					prepareGraphics();

					// Load the next file
			    	$scope.tData.PrepareNextFiles(nextFilename);
				})
			}
		})

		$scope.Chart = new Chart($scope, Time, "#velPlot", function(d) { return norm(d); })
	    $rootScope.$on("reloadChart", function(evt, pointIndex) {
			$scope.Chart.SelectPoint(pointIndex);
		})

		$rootScope.$on("tick", TimeTick);

		// start the renderer
		d3.timer(animate);
	
		$rootScope.$emit("scopeReady");
	}

	// ========================================================================
	// UTILITY FUNCTIONS
	// ========================================================================

	/*
	 * Call this method whenever a new bunch of data has been read and is ready
	 * to be displayed. 
	 * Updates the legend and the axis.
	 */
	function dataReady() {
	    var xmargin = width*0.1;
	    var ymargin = height*0.1;
	    x = d3.scale.linear().domain([$scope.tData.xMin, $scope.tData.xMax]).range([0+xmargin, width-xmargin]);
	    y = d3.scale.linear().domain([$scope.tData.yMin, $scope.tData.yMax]).range([height-ymargin, 0+ymargin]);

	    var minVel = d3.min($scope.tData.Data.map(function(d) { return d3.min(d.value.map(function(v) { return norm(v); })) }));
		var maxVel = d3.max($scope.tData.Data.map(function(d) { return d3.max(d.value.map(function(v) { return norm(v); })) }));

	    c = d3.scale.linear().domain([minVel, maxVel]).range(["gray", "white"]);

	    // Prepare all thingies
	    updateLegend(minVel, maxVel);
	    $scope.Chart.UpdateChart().Max(maxVel).Min(minVel);

	    isDataReady = true;
	}

	/*
	 * 
	 */
	function prepareGraphics() {
	    rectSize = (x(350) - x(0));

	    // Clear the stage
	    for (var i = stage.children.length - 1; i >= 0; i--) {
			stage.removeChild(stage.children[i]);
		};

		// Add one particle emitter per data point
	    $scope.tData.Data.forEach(function(d, i) {
	    	particleSystems[i] = new ParticleEmitter(x(d.x), y(d.y), rectSize);
	    	particleSystems[i].SetRenderer(stage);
	    	particleSystems[i].EnableParticleInteractivity(
	    		function(mouseData) { $rootScope.$emit("reloadChart", i); mouseDown = true; },
	    		function(mouseData) { if(!mouseDown) return; $rootScope.$emit("reloadChart", i); },
	    		function(mouseData) { mouseDown = false; });
	    });

	    // Prepare the marker symbol
	    markerSprite = new PIXI.Sprite.fromImage("/files/content/sites/aphys/files/MeteoLac/marker.png");
	    markerSprite.width = 50;
	    markerSprite.height = 50;
	    stage.addChild(markerSprite);
	    markerSprite.visible = false;
	}

	function prepareLegend() {
		var w = 300, h = 120;
		key = d3.select("#velLegend").append("svg").attr("id", "key").attr("width", w).attr("height", h);
		legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
		legend.append("stop").attr("offset", "0%").attr("stop-color", "gray").attr("stop-opacity", 0.1);
		legend.append("stop").attr("offset", "100%").attr("stop-color", "black").attr("stop-opacity", 1);
		key.append("rect").attr("width", w - 100).attr("height", h - 100).style("fill", "url(#gradient)");
		var color = key.append("g").attr("class", "x axis").attr("transform", "translate(0,22)");
		color.append("text").attr("y", 42).attr("dx", ".71em").style("text-anchor", "start").text("Velocity (m/s)");		
		return color;
	}

	function updateLegend(minVel, maxVel) {
		var x = d3.scale.linear().range([0, 200]).domain([minVel, maxVel]);
		var xAxis = d3.svg.axis().scale(x).ticks(4).orient("bottom");
		colorLegend.call(xAxis);
	}

	/*
	 * This function is called at each time control ticks.
	 * It is bound to the "tick" event sent by the rootScope.
	 * Do not call this directly.
	 */
	function TimeTick() {
		// Emit new particles for each grid point.
	    $scope.tData.Data.forEach(function(d, i) {
	    	var vec = d.value[Time.tIndex];
        	var color = parseInt(c(norm(vec)).toString().replace("#", "0x"));
        	// We need to divide by 1000 because the speed is given in m/s and we
        	// want it in km/s (because the position axis are in km).
        	var dx = x(vec[0]/1000) - x(0);
        	var dy = y(vec[1]/1000) - y(0);
        	// Also, because of the scale of the visualization, we amplify all 
        	// movements so we can see them better 
        	var velocityScale = 30000000;
        	particleSystems[i].Emit(dx*velocityScale, dy*velocityScale, color);
	    });
	}

	/*
	 * This function runs under a timer. It is in charge of ticking
	 * the particle emitters and rendering the canvas.
	 * Do not call this directly.
	 */
	function animate() {
		if(!isDataReady) return;

		// Protect against out-of-bounds exceptions
		if(Time.tIndex >= $scope.tData.nT) return;

	    // Animate the stuff here (transitions, color updates etc.)
	    $scope.tData.Data.forEach(function(d, i) {
        	particleSystems[i].Tick(1/60);
	    });

	    // Put the marker sprite at the correct position
	    markerSprite.visible = $scope.pointIndex != undefined;
	    if($scope.pointIndex != undefined) {
	    	markerSprite.position.x = x($scope.tData.Data[$scope.pointIndex].x) - markerSprite.width / 2;
	    	markerSprite.position.y = y($scope.tData.Data[$scope.pointIndex].y) - markerSprite.height / 2;
	    }

	    $scope.$apply();

	    // render the stage
	    renderer.render(stage);

	    // render the timeline on the chart
	    $scope.Chart.UpdateTimeLine()
	}

	/*
	 * Returns the norm of a vector.
	 * The vector is expected to be an array [x,y].
	 */
    function norm(vec) {
    	return vec[0]*vec[0] + vec[1]*vec[1];
    }
}]) 
app.controller("timeCtrl", ["$rootScope", "$scope", "Time", function($rootScope, $scope, Time) {

    var tickTimerId = null;
    var loopType = "repeat";

    // ------------------------------------------------------------------------
    // BOUND TO THE HTML
    // ------------------------------------------------------------------------

	$scope.play = function() {
		$("#playButton span").toggleClass("glyphicon-play glyphicon-pause");

		loopType = "repeat";

		if(tickTimerId == null)
			tickTimerId = setInterval(tick, 60);
		else
			$scope.pause();
	}

	$scope.playAll = function() {
		// Play, but instead of looping move to the next week
		$scope.play();
		loopType = "continue";
	}

	$scope.pause = function() {
		clearInterval(tickTimerId);
		tickTimerId = null;
	}
	$scope.backward = function() {
		Time.decrease();
	}
	$scope.forward = function() {
		Time.increase(true);
	}

	$scope.stop = function() {
		if(tickTimerId != null)
			$("#playButton span").toggleClass("glyphicon-play glyphicon-pause");

		$scope.pause();
		Time.tIndex = 0;
	}	

    $scope.getTime = function() {
    	return $scope.PrettyPrintTime(Time.tIndex, $scope.SelectedWeek, $scope.SelectedYear);
    }

	$scope.PrettyPrintTime = function(ti, weekNo, year) {
		var refDate = FirstDayOfWeek(weekNo, year);

		// tIndex corresponds to intervals, which are given by the global INTERVAL
		// in minutes, so we need to convert it into milliseconds
		var currentDate = new Date(refDate + ti*INTERVAL*60*1000);
		return currentDate.toLocaleDateString() + ":" + currentDate.getHours() + "h"; 	
	}

	$scope.PrettyPrintWeek = function(week) {
		var firstDay = FirstDayOfWeek(week, $scope.SelectedYear);
		var lastDay = LastDayOfWeek(week, $scope.SelectedYear);
		return new Date(firstDay).toLocaleDateString() + " - " + new Date(lastDay).toLocaleDateString();
	}

	$scope.ChangeWeek = function(week) {
		$scope.selectWeek(week);
		emitFullReload();
	}

	$scope.ChangeYear = function(year) {
		$scope.selectYear(year);
		emitFullReload();
	}

	// ------------------------------------------------------------------------
	// UTILITY METHODS
	// ------------------------------------------------------------------------

	$scope.selectWeek = function(week) {
		// Make sure the given week number is not out of bounds with the 
		// current year, and change year if necessary.
		var numberOfWeeks = NumberOfWeeks($scope.SelectedYear);
		if(week >= numberOfWeeks) {
			$scope.selectYear($scope.SelectedYear+1);
			$scope.selectWeek(week - numberOfWeeks + 1);
			return;
		} else if(week < 0) {
			$scope.selectYear --;
			$scope.selectWeek(week + numberOfWeeks);
			return;
		}

		$scope.SelectedWeek = week;
	}

	$scope.selectYear = function(year) {
		$scope.SelectedYear = year;
	}

    function tick() {
    	Time.increase(true);

    	$rootScope.$emit("tick");

    	if(Time.tIndex == 0) {
    		// we looped. Decide whether we play again the current week
    		// or if we play the next week
    		if(loopType == "continue") {
    		    $scope.selectWeek($scope.SelectedWeek+1);
    		    emitReload();
    		}
    	}

		$scope.$apply();
    }

    /**
     * Emit a "reloadWeek" message, indicating that the time has passed to 
     * a new week.
     */
	function emitReload() {
		$rootScope.$emit("reloadWeek", {week:$scope.SelectedWeek, year:$scope.SelectedYear, fullReload:false});
	}
	/**
	 * Emit a "reloadWeek" message, indicating that the user changed a 
	 * parameter in the time fields and that all data needs to be reloaded.
	 */
	function emitFullReload() {
		$rootScope.$emit("reloadWeek", {week:$scope.SelectedWeek, year:$scope.SelectedYear, fullReload:true});
	}

	// Available weeks to select from
	var now = new Date();
	var lastWeekNumber = NumberOfWeeks(now.getFullYear()); // months are 0-indexed
	$scope.Weeks = d3.range(1, lastWeekNumber);
	$scope.SelectedWeek = GetWeek(now);

	// Available years to select from
	$scope.Years = [2009, 2014, 2015];
	$scope.SelectedYear = now.getFullYear();

	$scope.Time = Time;

	// When a controller is ready, tell it the selected year/week to load
	$rootScope.$on("scopeReady", function() {
		emitReload();
	})

	// UI Logic to hide/show the sidebar time controls when scrolling
	$(".sidebar").hide()
	$(document).scroll(function() {
		if (!isScrolledIntoView($("#timeControls"))) {
			$('.sidebar').fadeIn();
		} else {
			$('.sidebar').fadeOut();
		}
	});

	function isScrolledIntoView(elem) {
	    var docViewTop = $(window).scrollTop();
	    var docViewBottom = docViewTop + $(window).height();

	    var elemTop = $(elem).offset().top;
	    var elemBottom = elemTop + $(elem).height();

	    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
	}	
}]); 
