angular.module('lakeViewApp').controller('TimeCtrl', function($rootScope, $scope, $interval, Time, DATA_HOST, DateHelpers, DataIndex) {
    var loopType = 'repeat';
    var TICK_INTERVAL_MIN = 50;
    var TICK_INTERVAL_MAX = 800;
    var tickInterval = 400;
    var tickTimerId = null;

    var ready = false;
    $scope.selection = {};

    $scope.$watch('selection', function(selection) {
        if (ready) {
            $scope.$broadcast('updateTimeSelection', selection);
        }
    }, true);

    $scope.$watch('Time.tIndex', function() {
        $scope.$broadcast('tick');
    });

    DataIndex.onReady(function() {
        $scope.index = DataIndex.index();

        // Initialize with current year/week, closest existing data for selected lake will be determined later
        var now = moment();
        $scope.selection = {
            year: now.year(),
            week: now.isoWeek()
        }

        $scope.ChangeLake(0);
        ready = true;
    });

    // TODO refactor
    $rootScope.$on('dataReady', function(evt, noValues) {
        Time.nT = noValues;
    });

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
        return ready ? DateHelpers.yearMonthDay(currentDate()) : '';
    }

    $scope.getTime = function() {
        return ready ? DateHelpers.hoursMinutes(currentDate()) : '';
    }

    $scope.PrettyPrintWeek = function(week) {
        var firstDay = DateHelpers.firstDayOfWeek(week, $scope.selection.year);
        var lastDay = DateHelpers.lastDayOfWeek(week, $scope.selection.year);
        return DateHelpers.yearMonthDay(firstDay) + ' - ' + DateHelpers.yearMonthDay(lastDay);
    }

    $scope.ChangeWeek = function(week) {
        $scope.selection.week = week;
    }

    $scope.ChangeYear = function(year) {
        $scope.selection.year = year;
        selectClosestWeek();
    }

    $scope.ChangeLake = function(lake) {
        var lakeData = $scope.index[lake];
        $scope.selection.lake = lake;
        $scope.selection.folder = lakeData.folder;
        $scope.selection.interval = lakeData.interval;
        selectClosestYear();
        selectClosestWeek();
    }

    // ------------------------------------------------------------------------
    // UTILITY METHODS
    // ------------------------------------------------------------------------

    function selectClosestYear() {
        var lakeData = $scope.index[$scope.selection.lake];
        $scope.selection.year = closest(lakeData.years, $scope.selection.year);
    }

    function selectClosestWeek() {
        var lakeData = $scope.index[$scope.selection.lake];
        $scope.selection.week = closest(lakeData.data.get($scope.selection.year), $scope.selection.week);
    }

    /**
      * finds the entry closest to <query> in <collection>
      */
    function closest(collection, query) {
        var minDiff = Number.MAX_VALUE;
        var result;
        collection.forEach(function(entry) {
            var diff = Math.abs(entry - query);
            if(diff < minDiff) {
                minDiff = diff;
                result = entry;
            }
        });
        return result;
    }

/*
    $scope.selectWeek = function(week) {
        // Make sure the given week number is not out of bounds with the 
        // current year, and change year if necessary.
        var numberOfWeeks = DateHelpers.numberOfWeeks($scope.selection.year);
        if(week >= numberOfWeeks) {
            $scope.selectYear($scope.selection.year+1);
            $scope.selectWeek(week - numberOfWeeks + 1);
            return;
        } else if(week < 0) {
            $scope.selectYear --;
            $scope.selectWeek(week + numberOfWeeks);
            return;
        }

        $scope.selection.week = week;
    }
*/
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
                $scope.selectWeek($scope.selection.week+1);
                emitReload();
            }
        }
    }

    function currentDate() {
        var refDate = DateHelpers.firstDayOfWeek($scope.selection.week, $scope.selection.year);
        return DateHelpers.addMinutes(refDate, Time.tIndex * $scope.selection.interval);
    }

    function isScrolledIntoView(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop + $(elem).height();

        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }    
});
