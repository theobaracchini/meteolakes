angular.module('meteolakesApp').controller('TimeCtrl', function($scope, $interval, Time, DateHelpers, DataIndex, Util) {
    $scope.init = function(availabilityFile, netcdfAvailabilityFile) {
        $scope.availabilityFile = availabilityFile;
        $scope.netcdfAvailabilityFile = netcdfAvailabilityFile;

        DataIndex.load($scope.availabilityFile).then(function(index) {
            $scope.index = index;

            if ($scope.netcdfAvailabilityFile) {
                DataIndex.loadNetcdf($scope.netcdfAvailabilityFile).then(function(netcdfIndex) {
                    $scope.netcdfIndex = netcdfIndex;
                    saveIndex();
            });
            } else {
                saveIndex();
            }
            
        }, function(err) {
            console.error('Failed to load data index!', err);
        });
    };

    function saveIndex() {
        indexReady = true;

        // Initialize with current year/week, closest existing
        // data for selected lake will be determined later
        var now = moment();

        $scope.selection = {
            year: now.year(),
            week: now.isoWeek(),
            depth: null
        };
        $scope.ChangeLake(0);
    }

    var TICK_INTERVAL_MIN = 50;
    var TICK_INTERVAL_MAX = 800;

    var tickInterval = 400;
    var tickTimerId = null;
    var steps = [];
    var wasPausedAutomatically = false;

    var indexReady = false;
    $scope.clientsKnown = 0; // Number of animations controlled by this controller
    $scope.clientsReady = 0; // Number of animations that are ready to play
    var wasPlaying = true; // Initialize as "true" to autoplay on page load
    $scope.playTimeout;

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
        wasPausedAutomatically = false;

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
        var nowMoment = moment();
        if ($scope.selection.week == nowMoment.isoWeek() && $scope.selection.year == nowMoment.year()){
            var nowStep = closestStep(nowMoment,steps);
            Time.tIndex = nowStep;
        }else{
            Time.tIndex = 0;
        }
    };

    $scope.getDate = function() {
        return allClientsReady() ? DateHelpers.dayMonthYear(currentDate()) : '';
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

    $scope.PrettyPrintDepth = function(depth) {
        return depth ? Math.abs(depth).toString() + " m" : "";
    }

    $scope.ChangeWeek = function(week) {
        $scope.selection.week = week;
        tryKeepDepth();
    };

    $scope.ChangeYear = function(year) {
        $scope.selection.year = year;
        selectClosestWeek();
        tryKeepDepth();
    };

    $scope.ChangeLake = function(lake) {
        var lakeData = $scope.index[lake];
        $scope.selection.lake = lake;
        $scope.selection.folder = lakeData.folder;
        $scope.selection.interval = lakeData.interval;

        selectClosestYear();
        selectClosestWeek();
        selectSurfaceDepth();
    };

    $scope.ChangeDepth = function(depth) {
        $scope.selection.depth = Math.abs(depth);
        $scope.selection.needNetcdf = true;
    };

    $scope.hasDepthList = function() {
        return ($scope.netcdfIndex && $scope.netcdfIndex[$scope.selection.lake] && 
            $scope.netcdfIndex[$scope.selection.lake].data.get($scope.selection.year) &&
            $scope.netcdfIndex[$scope.selection.lake].data.get($scope.selection.year).includes($scope.selection.week));
    }

    $scope.$on('$destroy', function() {
        if (tickTimerId) {
            $interval.cancel(tickTimerId);
        }
    });

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

    function selectDefaultDepth() {
        $scope.selection.depth = null;
        $scope.selection.needNetcdf = false;
    }
	
	function selectSurfaceDepth() {
		if($scope.hasDepthList()) {
			$scope.ChangeDepth($scope.netcdfIndex[$scope.selection.lake].depths[0]);
		} else {
			selectDefaultDepth();
		}
	}
	
	function tryKeepDepth() {
		if(!($scope.hasDepthList() && 
			$scope.netcdfIndex[$scope.selection.lake].depths.indexOf(-$scope.selection.depth) !== -1)) {
			selectSurfaceDepth();
		}
	}

    $scope.$on('moveToNextWeek', moveToNextWeek);

    function moveToNextWeek() {
        var week = $scope.selection.week;
        var year = $scope.selection.year;
        var date = moment().day('Monday').year(year).week(week);
        date.add(1, 'w');
        var lakeData = $scope.index[$scope.selection.lake];

        var nextYear = Util.closest(lakeData.years, date.year());
        var nextWeek = Util.closest(lakeData.data.get(date.year()),
                                date.week());

        if (year === nextYear && week === nextWeek) {
            if (!wasPausedAutomatically) {
                $scope.pause();
                Time.moveToEnd();
                $scope.$emit('timerPaused');
                wasPausedAutomatically = true;
            }
        } else {
            $scope.selection.week = nextWeek;
            $scope.selection.year = nextYear;
        }
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

            updateSliderCSS('input[type="range"]');


            var nowMoment = moment();
            if ($scope.selection.week == nowMoment.isoWeek() && $scope.selection.year == nowMoment.year()){
              var nowStep = closestStep(nowMoment,steps);
              Time.tIndex = nowStep;

              // Kind of bad fix but nice as "animation"
              setTimeout(function(){
                updateBubbleCSS();
              }, 1000);

              $scope.playTimeout = setTimeout(function(){
                if (wasPlaying && !$scope.isPlaying) {
                  wasPlaying = false;
                  $scope.play();
                }
              }, 5000);
            }else{
              removeBubbleCSS();
              if (wasPlaying && !$scope.isPlaying) {
                  wasPlaying = false;
                  $scope.play();
              }
          }

        }
    }

    function closestStep(selectMoment,momentsArray){
      var closestStep = NaN;
      var bestDiff = Infinity;

      var i;
      for(i = 0; i < momentsArray.length; ++i){
         var currDiff = Math.abs(momentsArray[i] - selectMoment);
         if(currDiff < bestDiff){
             closestStep = i;
             bestDiff = currDiff;
         }
      }
      return closestStep
    }

    function updateSliderCSS(field) {
      var nowMoment = moment();
      var nowStep = closestStep(nowMoment,steps)+1;
      if (nowStep == 1){
        nowStep = 0;
      }
      var val = nowStep/Time.nSteps;

      $(field).css('background-image',
                  '-webkit-gradient(linear, left top, right top, '
                  + 'color-stop(' + val + ', #989898), '
                  + 'color-stop(' + val + ', #ADD8E6)'
                  + ')'
                  );
      }
	  
	$scope.bubbleClick = function() {
        $scope.stop();
	}

   function updateBubbleCSS(){
     var el = $("input[type='range']");
     var position = el.position();
     var nowStep = closestStep(moment(),steps)+1;
     var val = nowStep/Time.nSteps;

     // Move large bubble
     if ($scope.selection.week == moment().isoWeek()){
       el
         .next("bubble.large")
         .css({
           left: val*el.width() + "px",
           marginLeft: position.left - 25 + "px",
           visibility: "visible",
           opacity: 0.82,
           cursor: "pointer"
          })

       // Move small bubble
       el
         .next("bubble.xs")
         .css({
           left: val*(window.innerWidth - 90) + "px",
           marginLeft: position.left - 3 + "px",
           visibility: "visible",
           opacity: 0.82,
           cursor: "pointer"
          })
        }
      }

   function removeBubbleCSS() {
        var el = $("input[type='range']");
        // Remove large bubble
        el
          .next("bubble.large")
          .css({
            visibility: "hidden",
            opacity: 0
          })

        // Remove small bubble
        el
          .next("bubble.xs")
          .css({
            visibility: "hidden",
            opacity: 0
          })
    };

    window.addEventListener("resize",updateBubbleCSS);

    // Needed cause when changing main tabs fast while timeout the animation will become unstoppable
    $scope.$on('$locationChangeSuccess', function(){
        clearTimeout($scope.playTimeout);
        $scope.pause();
        wasPlaying = false;
    });

});
