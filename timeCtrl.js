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
			tickTimerId = setInterval(tick, 100);
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
		var refDate = (new Date()).FirstDayOfWeek(weekNo, year);

		// tIndex is in 3-hours, so we need to convert it into milliseconds
		var currentDate = new Date(refDate + ti*3*60*60*1000);
		return currentDate.toLocaleDateString() + ":" + currentDate.getHours() + "h"; 	
	}

	$scope.PrettyPrintWeek = function(week) {
		var firstDay = (new Date()).FirstDayOfWeek(week, $scope.SelectedYear);
		var lastDay = (new Date()).LastDayOfWeek(week, $scope.SelectedYear);
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
	$scope.SelectedWeek = now.getWeek();

	// Available years to select from
	$scope.Years = [2009, 2014];
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