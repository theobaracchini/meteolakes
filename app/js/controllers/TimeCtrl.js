var app = angular.module('lakeViewApp');

app.controller('TimeCtrl', function($rootScope, $scope, $q, $interval, Time, DATA_HOST, DateHelpers) {
    var tickTimerId = null;
    var loopType = 'repeat';

    $scope.$watch('Time.tIndex', function() {
        $rootScope.$emit('tick');
    });

    // ------------------------------------------------------------------------
    // BOUND TO THE HTML
    // ------------------------------------------------------------------------

    $scope.play = function() {
        $('#playButton span').toggleClass('glyphicon-play glyphicon-pause');

        loopType = 'repeat';

        if(tickTimerId == null)
            tickTimerId = $interval(tick, 60);
        else
            $scope.pause();
    }

    $scope.playAll = function() {
        // Play, but instead of looping move to the next week
        $scope.play();
        loopType = 'continue';
    }

    $scope.pause = function() {
        $interval.cancel(tickTimerId);
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
            $('#playButton span').toggleClass('glyphicon-play glyphicon-pause');

        $scope.pause();
        Time.tIndex = 0;
    }    

    $scope.getTime = function() {
        return $scope.PrettyPrintTime(Time.tIndex, $scope.SelectedWeek, $scope.SelectedYear);
    }

    $scope.PrettyPrintTime = function(ti, weekNo, year) {
        var refDate = DateHelpers.FirstDayOfWeek(weekNo, year);

        // tIndex corresponds to intervals, which are given by the global INTERVAL
        // in minutes, so we need to convert it into milliseconds
        if ($scope.Dates) {
            var currentDate = new Date(refDate + ti * $scope.Dates[$scope.SelectedLake].interval * 60 * 1000);
            return currentDate.toLocaleDateString() + ':' + currentDate.getHours() + 'h';
        } else {
            return 'Loading...';
        }
    }

    $scope.PrettyPrintWeek = function(week) {
        var firstDay = DateHelpers.FirstDayOfWeek(week, $scope.SelectedYear);
        var lastDay = DateHelpers.LastDayOfWeek(week, $scope.SelectedYear);
        return new Date(firstDay).toLocaleDateString() + ' - ' + new Date(lastDay).toLocaleDateString();
    }

    $scope.ChangeWeek = function(week) {
        $scope.selectWeek(week);
        emitFullReload();
    }

    $scope.ChangeYear = function(year) {
        $scope.selectYear(year);
        emitFullReload();
    }

    $scope.ChangeLake = function(lake) {
        $scope.selectLake(lake);
        emitFullReload();
    }

    // ------------------------------------------------------------------------
    // UTILITY METHODS
    // ------------------------------------------------------------------------

    $scope.selectWeek = function(week) {
        // Make sure the given week number is not out of bounds with the 
        // current year, and change year if necessary.
        var numberOfWeeks = DateHelpers.NumberOfWeeks($scope.SelectedYear);
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
        $scope.Weeks = [];
        var weeksForYear = $scope.Dates[$scope.SelectedLake]['data']['Y' + $scope.SelectedYear];
        weeksForYear.forEach(function(week) {
            $scope.Weeks.push(week);
        });
    }

    $scope.selectLake = function(lake) {
        $scope.SelectedLake = lake;
        Time.recomputeTimesteps($scope.Dates[$scope.SelectedLake].interval);
        selectDateClosestToNow();
    }

    function tick() {
        Time.increase(true);

        if(Time.tIndex == 0) {
            // we looped. Decide whether we play again the current week
            // or if we play the next week
            if(loopType == 'continue') {
                $scope.selectWeek($scope.SelectedWeek+1);
                emitReload();
            }
        }
    }

    /**
     * Emit a 'reloadWeek' message, indicating that the time has passed to 
     * a new week.
     */
    function emitReload() {
        $rootScope.$emit('reloadWeek', {week:$scope.SelectedWeek, year:$scope.SelectedYear, fullReload:false, folder:$scope.Dates[$scope.SelectedLake]['folder'], weeks:$scope.Dates[$scope.SelectedLake]['data']['Y' + $scope.SelectedYear]});
    }
    /**
     * Emit a 'reloadWeek' message, indicating that the user changed a 
     * parameter in the time fields and that all data needs to be reloaded.
     */
    function emitFullReload() {
        $rootScope.$emit('reloadWeek', {week:$scope.SelectedWeek, year:$scope.SelectedYear, fullReload:true, folder:$scope.Dates[$scope.SelectedLake]['folder'], weeks:$scope.Dates[$scope.SelectedLake]['data']['Y' + $scope.SelectedYear]});
    }

    function loadAvailableDates() {
        $scope.Weeks = [];
        $scope.SelectedWeek = undefined;
        $scope.Years = [];
        $scope.SelectedYear = undefined;

        return $q(function(resolve, reject) {
            d3.json(DATA_HOST + 'available_data.json', function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    $scope.Dates = data;
                    $scope.SelectedLake = 0; // first one in the array of lakes (i.e. data[0])
                    Time.recomputeTimesteps(data[$scope.SelectedLake].interval);
                    resolve();
                }
            });
        });
    }

    function selectWeekClosestToNow() {
        var now = new Date();
        var currentWeek = DateHelpers.GetWeek(now);

        // Find the week closest to now
        var minDiffWeek = Number.MAX_VALUE; // large initial value for week diff
        $scope.Weeks = [];
        for(var i = 0 ; i <  $scope.Dates[$scope.SelectedLake]['data']['Y' + $scope.SelectedYear].length ; ++i) {
            var week = $scope.Dates[$scope.SelectedLake]['data']['Y' + $scope.SelectedYear][i];
            $scope.Weeks.push(week);
            var diffWeek = Math.abs(week - currentWeek);
            if(diffWeek < minDiffWeek) {
                minDiffWeek = diffWeek;
                $scope.SelectedWeek = week;
            }
        }
    }

    function selectDateClosestToNow() {
        var now = new Date();
        var currentYear = now.getFullYear();
        
        // Find the year closest to now
        var minDiffYear = Number.MAX_VALUE; // take a large initial value for year diff
        $scope.Years = [];
        for(var syear in $scope.Dates[$scope.SelectedLake]['data']) {
            var year = parseInt(syear.substring(1));
            $scope.Years.push(year);
            var diffYear = Math.abs(year - currentYear);
            if(diffYear < minDiffYear) {
                minDiffYear = diffYear;
                $scope.SelectedYear = year;
            }
        }

        selectWeekClosestToNow();

        emitReload();
    }

    loadAvailableDates().then(selectDateClosestToNow);

    // When a controller is ready, tell it the selected year/week to load
    $rootScope.$on('scopeReady', function() {
        if($scope.Dates)
            emitReload();
    })

    $scope.Time = Time;


    // UI Logic to hide/show the sidebar time controls when scrolling
    $('.sidebar').hide()
    $(document).scroll(function() {
        if (!isScrolledIntoView($('#timeControls'))) {
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
});
