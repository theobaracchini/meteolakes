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
			isDataReady = false

			var currentFilename = "data/velocity/" + time.year + "/data_week" + time.week + ".csv"
			var nextFilename = "data/velocity/" + time.year + "/data_week" + (time.week+1) + ".csv"

			if($scope.tData && $scope.tData.HasNextData() && !time.fullReload) {
				// If we have already loaded the next values file, swap it and load the one after that
				$scope.tData.SwitchToNextData().PrepareNextFiles(nextFilename);

				dataReady();
			} else {
				// First time initialization
				$scope.tData = new TemporalData(currentFilename, 2, 56, function() {
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
	        // sprites[i].sprite.interactive = true;
	        // sprites[i].sprite.mousedown = function(mouseData) { $rootScope.$emit("reloadChart", i); mouseDown = true; }
	        // sprites[i].sprite.mouseover = function(mouseData) { if(!mouseDown) return; $rootScope.$emit("reloadChart", i); }
	        // sprites[i].sprite.mouseup = function(mouseData) { mouseDown = false; }
	    })

	    // Prepare the marker symbol
	    markerSprite = new PIXI.Sprite.fromImage("marker.png");
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

	function TimeTick() {
	    $scope.tData.Data.forEach(function(d, i) {
	    	var vec = d.value[Time.tIndex];
        	var color = parseInt(c(norm(vec)).toString().replace("#", "0x"));
        	// We need to divide by 1000 because the speed is given in m/s and we
        	// want it in km/s (because the position axis are in km).
        	var velocityScale = 20000000;
        	var dx = x(vec[0]/1000) - x(0);
        	var dy = y(vec[1]/1000) - y(0);
        	particleSystems[i].Emit(dx*velocityScale, dy*velocityScale, color);
	    });
	}

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

    function norm(vec) {
    	return vec[0]*vec[0] + vec[1]*vec[1];
    }
}])