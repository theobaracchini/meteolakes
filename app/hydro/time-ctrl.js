angular.module('lakeViewApp').controller('TimeCtrl', function($scope, $interval, Time, DATA_HOST, DateHelpers, HydroDataIndex, Util) {
    var TICK_INTERVAL_MIN = 50;
    var TICK_INTERVAL_MAX = 800;

    var tickInterval = 400;
    var tickTimerId = null;
    var steps = [];

    var indexReady = false;
    $scope.clientsKnown = 0; // Number of animations controlled by this controller
    $scope.clientsReady = 0; // Number of animations that are ready to play
    var wasPlaying = true; // Initialize as "true" to autoplay on page load

    $scope.isPlaying = false;
    $scope.selection = {};

    $scope.$watch('selection', function(selection) {
        if (indexReady) {
            wasPlaying = $scope.isPlaying || wasPlaying;
            $scope.stop();
            $scope.clientsReady = 0;
            $scope.$broadcast('updateTimeSelection', selection);
        }
    }, true);

    $scope.$watch('Time.tIndex', function() {
        $scope.$broadcast('tick');
    });

    $scope.$on('tabChanged', function() {
        wasPlaying = $scope.isPlaying || wasPlaying;
        $scope.pause();
        $scope.clientsReady--;
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

    // To be called exactly once by each client controller
    $scope.$on('registerClient', function() {
        $scope.clientsKnown++;
    });

    $scope.$on('dataReady', function(evt, timeSteps) {
        // The time steps are updated whenever one of the connected
        // animations finishes loading data.
        // Since all animations on the page use the same time scale,
        // it shouldn't matter which one is used by the time controller
        // (it will be the last one to finish loading)
        steps = timeSteps;
        Time.nSteps = steps.length;
        $scope.clientsReady++;
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
        return allClientsReady() ? DateHelpers.yearMonthDay(currentDate()) : '';
    };

    $scope.getTime = function() {
        return allClientsReady() ? DateHelpers.hoursMinutes(currentDate()) : '';
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

    function allClientsReady() {
        return ($scope.clientsReady === $scope.clientsKnown) && ($scope.clientsKnown > 0);
    }

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
        if (allClientsReady()) {
            if (wasPlaying && !$scope.isPlaying) {
                wasPlaying = false;
                $scope.play();
            }
        }
    }
});
