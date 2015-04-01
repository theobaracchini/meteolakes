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

			if($scope.tData && !time.fullReload) {
				// Regular switching of weeks, because the time slider was moving forward.
				$scope.tData.SwitchToData(time.week, time.year).PrepareData(time.week+1, time.year, function() { 
					dataReady();
				});
			} else if($scope.tData && time.fullReload) {
				// User changed the date in the lists.
				// Typically means that the required data and the next data are not ready yet.
				$scope.tData.PrepareData(time.week, time.year, function() {
					$scope.tData.SwitchToData(time.week, time.year);
					dataReady();
					prepareGraphics();
				});
				$scope.tData.PrepareData(time.week+1, time.year, function() {});
			} else {
				// First time initialization. Load the required data and the next.
				$scope.tData = new TemporalData(time.folder, 'temperature', time.week, time.year, function() {
					dataReady();
					prepareGraphics();

					// Load the next file
			    	$scope.tData.PrepareData(time.week+1, time.year, function() {});
				});
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

	    // Animate the stuff here (transitions, color updates etc.)
		var rectSize = x(700) - x(0);
	    $scope.tData.Data.forEach(function(d, i) {
	    	if(Time.tIndex >= d.value.length) return;
	    	
	        var value = d.value[Time.tIndex];
	        sprites[i].sprite.visible = !isNaN(d.value[Time.tIndex]);
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