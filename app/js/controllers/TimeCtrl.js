angular.module('lakeViewApp').controller('TimeCtrl', function($rootScope, $scope, $q, $interval, Time, DATA_HOST, DateHelpers) {
    var loopType = 'repeat';
    var TICK_INTERVAL_MIN = 50;
    var TICK_INTERVAL_MAX = 800;
    var tickInterval = 400;
    var tickTimerId = null;

    $scope.$watch('Time.tIndex', function() {
        $rootScope.$emit('tick');
    });

    // ------------------------------------------------------------------------
    // BOUND TO THE HTML
    // ------------------------------------------------------------------------

    $scope.play = function() {
        $('#playButton span').toggleClass('glyphicon-play glyphicon-pause');

        loopType = 'repeat';

        if (tickTimerId == null) {
            tickTimerId = $interval(tick, tickInterval);
        } else {
            $scope.pause();
        }
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
    $scope.slower = function() {
        if (tickInterval < TICK_INTERVAL_MAX) {
            tickInterval *= 2;
        }
        resetTimer();
        updateSpeedButtons();
    }
    $scope.faster = function() {
        if (tickInterval > TICK_INTERVAL_MIN) {
            tickInterval /= 2;
        }
        resetTimer();
        updateSpeedButtons();
    }

    $scope.stop = function() {
        if(tickTimerId != null)
            $('#playButton span').toggleClass('glyphicon-play glyphicon-pause');

        $scope.pause();
        Time.tIndex = 0;
    }    

    $scope.getDate = function() {
        return $scope.Dates ? localISODate(currentDate()) : '';
    }

    $scope.getTime = function() {
        return $scope.Dates ? localISOTime(currentDate()) : '';
    }

    $scope.PrettyPrintWeek = function(week) {
        var firstDay = DateHelpers.FirstDayOfWeek(week, $scope.SelectedYear);
        var lastDay = DateHelpers.LastDayOfWeek(week, $scope.SelectedYear);
        return localISODate(firstDay) + ' - ' + localISODate(lastDay);
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

    function resetTimer() {
        if (tickTimerId) {
            $interval.cancel(tickTimerId);
            tickTimerId = $interval(tick, tickInterval);
        }
    }

    function updateSpeedButtons() {
        $('.lv-faster').prop('disabled', tickInterval == TICK_INTERVAL_MIN);
        $('.lv-slower').prop('disabled', tickInterval == TICK_INTERVAL_MAX);
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

    function currentDate() {
        var refDate = DateHelpers.FirstDayOfWeek($scope.SelectedWeek, $scope.SelectedYear);
        // tIndex corresponds to intervals, which are given by the global INTERVAL
        // in minutes, so we need to convert it into milliseconds
        return new Date(refDate.getTime() + Time.tIndex * $scope.Dates[$scope.SelectedLake].interval * 60 * 1000);
    }

    function pad(n) {
        return n < 10 ? '0' + n : n;
    }

    function localISODate(date) {
        return date.getFullYear() + '-'
            + pad(date.getMonth() + 1) + '-'
            + pad(date.getDate());
    };

    function localISOTime(date) {
        return pad(date.getHours()) + ':' + pad(date.getMinutes());
    };

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
