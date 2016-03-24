var app = angular.module('lakeViewApp');

app.controller('TemperatureCtrl', function($rootScope, $scope, Time, Chart, misc, TemporalData, Map) {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    var webgl = misc.PrepareWebGLContext('#tempContainer', true, 2);
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

    var canvasLayer;
    var map = Map.initMap('tempMap');

    Initialize();

    // ========================================================================
    // INIT (I know, code above is also some initialization. Deal with it.)
    // ========================================================================
    function Initialize() {
        $rootScope.$on('reloadWeek', function(evt, time) {
            isDataReady = false;

            if($scope.tData && !time.fullReload) {
                // Regular switching of weeks, because the time slider was moving forward.
                $scope.tData.SwitchToData(time.week, time.year);
                // Load the next file if available
                if(time.weeks.indexOf(time.week+1) != -1)
                    $scope.tData.readData(time.week+1, time.year, function() { 
                        dataReady();
                    });
            } else if($scope.tData && time.fullReload) {
                // User changed the date in the lists.
                // Typically means that the required data and the next data are not ready yet.
                $scope.tData.readData(time.week, time.year, function() {
                    $scope.tData.SwitchToData(time.week, time.year);
                    dataReady();
                    prepareGraphics();
                });
                // Load the next file if available
                if(time.weeks.indexOf(time.week+1) != -1)
                    $scope.tData.readData(time.week+1, time.year, function() {});
            } else {
                $scope.tData = new TemporalData(time.folder, 'temperature');
                $scope.tData.readData(time.week, time.year, function() {
                    $scope.tData.SwitchToData(time.week, time.year);

                    dataReady();
                    prepareGraphics();

                    // Load the next file if available
                    if(time.weeks.indexOf(time.week+1) != -1)
                        $scope.tData.readData(time.week+1, time.year, function() {});
                });
            }
        })

        $scope.Chart = new Chart($scope, Time, '#tempPlot', function(d) { return d })
        $rootScope.$on('reloadChart', function(evt, pointIndex) {
            $scope.Chart.SelectPoint(pointIndex);
        })

        $rootScope.$on('tick', function() {
            animate();
        })
        // start the renderer
        // d3.timer(animate);

        $rootScope.$emit('scopeReady');        
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function dataReady() {
        var xmargin = width*0.1;
        var ymargin = height*0.1;
        x = d3.scale.linear().domain([$scope.tData.xMin, $scope.tData.xMax]).range([0+xmargin, width-xmargin]);
        y = d3.scale.linear().domain([$scope.tData.yMin, $scope.tData.yMax]).range([height-ymargin, 0+ymargin]);

        var tMin = d3.min($scope.tData.Data.map(function(d) { return d3.min(d.values) }));
        var tMax = d3.max($scope.tData.Data.map(function(d) { return d3.max(d.values) }));

        c = d3.scale.linear().domain([tMin, (tMin+tMax)/2, tMax]).range(['blue', 'lime', 'red']);

        // Prepare all thingies
        updateLegend(tMin, tMax);
        $scope.Chart.UpdateChart($scope.tData.DataTime).Max(tMax).Min(tMin);

        isDataReady = true;
    }

    function prepareGraphics() {
        var rectSize = x(700) - x(0);

        // Clear the stage
        for (var i = stage.children.length - 1; i >= 0; i--) {
            stage.removeChild(stage.children[i]);
        };

        $scope.tData.Data.forEach(function(d, i) {
            var doc = misc.rectangle(x(d.x)-rectSize/2, y(d.y)-rectSize/2,
                rectSize,rectSize,
                parseInt(c(d.values[Time.tIndex]).toString().replace('#', '0x')));
            stage.addChild(doc.graphic);
            sprites[i] = doc;
            sprites[i].sprite.interactive = true;
            sprites[i].sprite.mousedown = function(mouseData) { $rootScope.$emit('reloadChart', i); mouseDown = true; }
            sprites[i].sprite.mouseover = function(mouseData) { if(!mouseDown) return; $rootScope.$emit('reloadChart', i); }
            sprites[i].sprite.mouseup = function(mouseData) { mouseDown = false; }
        })

        var temperatureData = $scope.tData.map(function(d) {
            var latlng = Map.unproject(L.point(d.x, d.y));
            return {
                lat: latlng.lat,
                lng: latlng.lng,
                values: d.values
            }
        });

        if (canvasLayer) {
            map._map.removeLayer(canvasLayer);
        }

        canvasLayer = L.canvasLayer(temperatureData, {colorFunction: c});
        canvasLayer.addTo(map._map);

        // Prepare the marker symbol
        markerSprite = new PIXI.Sprite.fromImage('img/marker.png');
        markerSprite.width = 50;
        markerSprite.height = 50;
        stage.addChild(markerSprite);
        markerSprite.visible = false;

        animate();
    }

    function prepareLegend() {
        var w = 300, h = 120;
        var key = d3.select('#tempLegend').append('svg').attr('id', 'key').attr('width', w).attr('height', h);
        var legend = key.append('defs').append('svg:linearGradient').attr('id', 'gradient').attr('x1', '0%').attr('y1', '100%').attr('x2', '100%').attr('y2', '100%').attr('spreadMethod', 'pad');
        legend.append('stop').attr('offset', '0%').attr('stop-color', 'blue').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '50%').attr('stop-color', 'lime').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '100%').attr('stop-color', 'red').attr('stop-opacity', 1);
        key.append('rect').attr('width', w - 100).attr('height', h - 100).style('fill', 'url(#gradient)')
        var color = key.append('g').attr('class', 'x axis').attr('transform', 'translate(0,22)');
        color.append('text').attr('y', 42).attr('dx', '.71em').style('text-anchor', 'start').text('Temperature (°C)');
        return color;
    }

    function updateLegend(tMin, tMax) {
        var x = d3.scale.linear().range([0, 200]).domain([tMin, tMax]);
        var xAxis = d3.svg.axis().scale(x).ticks(4).orient('bottom');
        colorLegend.call(xAxis);
    }

    function animate() {
        if(!isDataReady) return;

        // Animate the stuff here (transitions, color updates etc.)
        var rectSize = x(700) - x(0);

        $scope.tData.Data.forEach(function(d, i) {
            if(Time.tIndex >= d.values.length) return;
            
            var value = d.values[Time.tIndex];
            sprites[i].sprite.visible = !isNaN(d.values[Time.tIndex]);
            var color = parseInt(c(value).toString().replace('#', '0x'));
            sprites[i].sprite.tint = color;
        });

        canvasLayer.setStep(Time.tIndex);

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
});