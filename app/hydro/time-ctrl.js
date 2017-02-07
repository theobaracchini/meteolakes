angular.module('lakeViewApp').controller('TimeCtrl', function($scope, $interval, Time, DATA_HOST, DateHelpers, HydroDataIndex, Util) {
    var TICK_INTERVAL_MIN = 50;
    var TICK_INTERVAL_MAX = 800;

    var tickInterval = 400;
    var tickTimerId = null;
    var steps = [];

    var indexReady = false;
    $scope.vDataReady = false;
    $scope.tDataReady = false;
    var wasPlaying = true; // Initialize as "true" to autoplay on page load

    $scope.isPlaying = false;
    $scope.selection = {};
    $scope.BUCHILLON_URL = 'http://meteolakes.epfl.ch/graph-view/beta/';

    $scope.$watch('selection', function(selection) {
        if (indexReady) {
            wasPlaying = $scope.isPlaying || wasPlaying;
            $scope.stop();
            $scope.vDataReady = false;
            $scope.tDataReady = false;
            $scope.$broadcast('updateTimeSelection', selection);
        }
    }, true);

    $scope.$watch('Time.tIndex', function() {
        $scope.$broadcast('tick');
    });

    $scope.$on('tTabChanged', function() {
        wasPlaying = $scope.isPlaying || wasPlaying;
        $scope.pause();
        $scope.tDataReady = false;
    });

    HydroDataIndex.load().then(function(index) {
        $scope.index = index;

        // Initialize with current year/week, closest existing
        // data for selected lake will be determined later
        var now = moment();
        $scope.selection = {
            year: now.year(),
            week: now.isoWeek()
        };

        $scope.ChangeLake(0);
        indexReady = true;
    }, function(err) {
        console.error('Failed to load data index!', err);
    });

    $scope.$on('vDataReady', function(evt, timeSteps) {
        steps = timeSteps;
        Time.nSteps = steps.length;
        $scope.vDataReady = true;
        resumeIfReady();
    });

    $scope.$on('tDataReady', function() {
        $scope.tDataReady = true;
        resumeIfReady();
    });

    $scope.Time = Time;

    $scope.play = function() {
        $scope.isPlaying = true;

        if (tickTimerId == null) {
            tickTimerId = $interval(tick, tickInterval);
        } else {
            $scope.pause();
        }
    };

    $scope.pause = function() {
        $scope.isPlaying = false;
        $interval.cancel(tickTimerId);
        tickTimerId = null;
    };

    $scope.backward = function() {
        Time.decrease();
    };

    $scope.forward = function() {
        Time.increase(false);
    };

    $scope.slower = function() {
        if (tickInterval < TICK_INTERVAL_MAX) {
            tickInterval *= 2;
        }
        resetTimer();
        updateSpeedButtons();
    };

    $scope.faster = function() {
        if (tickInterval > TICK_INTERVAL_MIN) {
            tickInterval /= 2;
        }
        resetTimer();
        updateSpeedButtons();
    };

    $scope.stop = function() {
        $scope.pause();
        Time.tIndex = 0;
    };

    $scope.getDate = function() {
        return $scope.vDataReady ? DateHelpers.yearMonthDay(currentDate()) : '';
    };

    $scope.getTime = function() {
        return $scope.vDataReady ? DateHelpers.hoursMinutes(currentDate()) : '';
    };

    $scope.PrettyPrintWeek = function(week) {
        var firstDay = DateHelpers.firstDayOfWeek(week, $scope.selection.year);
        var lastDay = DateHelpers.lastDayOfWeek(week, $scope.selection.year);
        var dateRange = DateHelpers.yearMonthDay(firstDay) + ' - ' + DateHelpers.yearMonthDay(lastDay);
        return 'Week ' + week + ' (' + dateRange + ')';
    };

    $scope.ChangeWeek = function(week) {
        $scope.selection.week = week;
    };

    $scope.ChangeYear = function(year) {
        $scope.selection.year = year;
        selectClosestWeek();
    };

    $scope.ChangeLake = function(lake) {
        var lakeData = $scope.index[lake];
        $scope.selection.lake = lake;
        $scope.selection.folder = lakeData.folder;
        $scope.selection.interval = lakeData.interval;
        selectClosestYear();
        selectClosestWeek();
    };

    function selectClosestYear() {
        var lakeData = $scope.index[$scope.selection.lake];
        $scope.selection.year = Util.closest(lakeData.years, $scope.selection.year);
    }

    function selectClosestWeek() {
        var lakeData = $scope.index[$scope.selection.lake];
        $scope.selection.week = Util.closest(lakeData.data.get($scope.selection.year),
                                $scope.selection.week);
    }

    function resetTimer() {
        if (tickTimerId) {
            $interval.cancel(tickTimerId);
            tickTimerId = $interval(tick, tickInterval);
        }
    }

    function updateSpeedButtons() {
        $('.lv-faster').prop('disabled', tickInterval === TICK_INTERVAL_MIN);
        $('.lv-slower').prop('disabled', tickInterval === TICK_INTERVAL_MAX);
    }

    function tick() {
        Time.increase(true);
    }

    function currentDate() {
        return steps[Time.tIndex];
    }

    function resumeIfReady() {
        if ($scope.vDataReady && $scope.tDataReady) {
            if (wasPlaying && !$scope.isPlaying) {
                wasPlaying = false;
                $scope.play();
            }
        }
    }
});
