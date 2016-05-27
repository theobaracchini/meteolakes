angular.module('lakeViewApp').controller('TimeCtrl', function($scope, $interval, Time, DATA_HOST, DateHelpers, DataIndex, Util) {
    var TICK_INTERVAL_MIN = 50;
    var TICK_INTERVAL_MAX = 800;

    var tickInterval = 400;
    var tickTimerId = null;
    var steps = [];

    var indexReady = false;
    var dataReady = false;
    $scope.selection = {};

    $scope.$watch('selection', function(selection) {
        if (indexReady) {
            $scope.stop();
            $scope.$broadcast('updateTimeSelection', selection);
        }
    }, true);

    $scope.$watch('Time.tIndex', function() {
        $scope.$broadcast('tick');
    });

    DataIndex.load().then(function(index) {
        $scope.index = index;

        // Initialize with current year/week, closest existing data for selected lake will be determined later
        var now = moment();
        $scope.selection = {
            year: now.year(),
            week: now.isoWeek()
        }

        $scope.ChangeLake(0);
        indexReady = true;
    }, function(err) {
        console.error('Failed to load data index!', err);
    });

    $scope.$on('dataReady', function(evt, timeSteps) {
        // TODO refactor
        Time.nT = timeSteps.length;
        steps = timeSteps;
        dataReady = true;
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

    $scope.play = function() {
        $('#playButton span').toggleClass('glyphicon-play glyphicon-pause');

        if (tickTimerId == null) {
            tickTimerId = $interval(tick, tickInterval);
        } else {
            $scope.pause();
        }
    };

    $scope.pause = function() {
        $interval.cancel(tickTimerId);
        tickTimerId = null;
    };

    $scope.backward = function() {
        Time.decrease();
    };

    $scope.forward = function() {
        Time.increase(true);
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
        if(tickTimerId != null)
            $('#playButton span').toggleClass('glyphicon-play glyphicon-pause');

        $scope.pause();
        Time.tIndex = 0;
    };  

    $scope.getDate = function() {
        return dataReady ? DateHelpers.yearMonthDay(currentDate()) : '';
    };

    $scope.getTime = function() {
        return dataReady ? DateHelpers.hoursMinutes(currentDate()) : '';
    };

    $scope.PrettyPrintWeek = function(week) {
        var firstDay = DateHelpers.firstDayOfWeek(week, $scope.selection.year);
        var lastDay = DateHelpers.lastDayOfWeek(week, $scope.selection.year);
        return DateHelpers.yearMonthDay(firstDay) + ' - ' + DateHelpers.yearMonthDay(lastDay);
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
        $scope.selection.week = Util.closest(lakeData.data.get($scope.selection.year), $scope.selection.week);
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
    }

    function currentDate() {
        return steps[Time.tIndex];
    }

    // TODO remove
    function isScrolledIntoView(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop + $(elem).height();

        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }    
});
