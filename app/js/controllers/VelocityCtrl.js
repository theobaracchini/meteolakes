var app = angular.module('lakeViewApp');

app.controller('VelocityCtrl', function($rootScope, $scope, Time, Chart, misc, TemporalData, Map) {
    // ========================================================================
    // PROPERTIES
    // ========================================================================

    var lengthFactor = 1;
    var webgl = misc.PrepareWebGLContext('#velContainer', true, 2);
    var width = webgl.width;
    var height = webgl.height;
    var stage = webgl.stage;
    var renderer = webgl.renderer;
    var markerSprite = null;

    var isDataReady = false;

    var x,y,c; // d3 axis (x,y, color)
    var rectSize;
    var sprites = [];
    var lines = [];

    var colorLegend = prepareLegend();

    var mouseDown = false;
    
    Initialize();
    var map = Map.initMap('velMap');

    // ========================================================================
    // INIT (I know, code above is also initialization. Deal with it.)
    // ========================================================================
    function Initialize() {
        $rootScope.$on('reloadWeek', function(evt, time) {
            isDataReady = false;

            if($scope.tData && !time.fullReload) {
                // Regular switching of weeks, because the time slider was moving forward.
                $scope.tData.SwitchToData(time.week, time.year);
                // Load the next file if available
                if(time.weeks.indexOf(time.week+1) != -1)
                    $scope.tData.PrepareData(time.week+1, time.year, function() { 
                        dataReady();
                    });
            } else if($scope.tData && time.fullReload) {
                // User changed the date in the lists.
                // Typically means that the required data and the next data are not ready yet.
                $scope.tData.PrepareData(time.week, time.year, function() {
                    $scope.tData.SwitchToData(time.week, time.year);
                    dataReady();
                    prepareGraphics();
                });
                // Load the next file if available
                if(time.weeks.indexOf(time.week+1) != -1)
                    $scope.tData.PrepareData(time.week+1, time.year, function() {});
            } else {
                // First time initialization. Load the required data and the next.
                $scope.tData = new TemporalData(time.folder, 'velocity');
                $scope.tData.PrepareData(time.week, time.year, function() {
                    $scope.tData.SwitchToData(time.week, time.year);

                    dataReady();
                    prepareGraphics();

                    // Load the next file, if available
                    if(time.weeks.indexOf(time.week+1) != -1)
                        $scope.tData.PrepareData(time.week+1, time.year, function() {});
                });
            }
        })

        $scope.Chart = new Chart($scope, Time, '#velPlot', function(d) { return norm(d); })
        $rootScope.$on('reloadChart', function(evt, pointIndex) {
            $scope.Chart.SelectPoint(pointIndex);
        })

        // start the renderer
        // d3.timer(animate);
    
        $rootScope.$emit('scopeReady');
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /*
     * Call this method whenever a new bunch of data has been read and is ready
     * to be displayed. 
     * Updates the legend and the axis.
     */
    function dataReady() {
        var xmargin = width*0.1;
        var ymargin = height*0.1;
        x = d3.scale.linear().domain([$scope.tData.xMin, $scope.tData.xMax]).range([0+xmargin, width-xmargin]);
        y = d3.scale.linear().domain([$scope.tData.yMin, $scope.tData.yMax]).range([height-ymargin, 0+ymargin]);

        var minVel = d3.min($scope.tData.Data.map(function(d) { return d3.min(d.value.map(function(v) { return norm(v); })) }));
        var maxVel = d3.max($scope.tData.Data.map(function(d) { return d3.max(d.value.map(function(v) { return norm(v); })) }));

        c = d3.scale.linear().domain([minVel, (minVel+maxVel)/2, maxVel]).range(['blue', 'lime', 'red']);

        // Prepare all thingies
        updateLegend(minVel, maxVel);
        $scope.Chart.UpdateChart($scope.tData.DataTime).Max(maxVel).Min(minVel);

        isDataReady = true;
    }

    /*
     * 
     */
    function prepareGraphics() {
        var rectSize = x(50) - x(0);

        // Clear the stage
        for (var i = stage.children.length - 1; i >= 0; i--) {
            stage.removeChild(stage.children[i]);
        };

        $scope.tData.Data.forEach(function(d, i) {

            // Clickable dots at grid locations
            /*var doc = circle(x(d.x), y(d.y), rectSize, '0x000000');
            stage.addChild(doc.graphic);
            sprites[i] = doc;
            sprites[i].sprite.interactive = true;
            sprites[i].sprite.mousedown = function(mouseData) { $rootScope.$emit('reloadChart', i); mouseDown = true; }
            sprites[i].sprite.mouseover = function(mouseData) { if(!mouseDown) return; $rootScope.$emit('reloadChart', i); }
            sprites[i].sprite.mouseup = function(mouseData) { mouseDown = false; }*/

            // Animated lines on top
            
            // TODO: more elegant sampling
            if (isNaN(d.x)) return;
            if (i % 10 != 0) return;
            var lineWidth = 1;
            var li = misc.arrow(x(d.x), y(d.y), -10, 0, lineWidth);
            lines[i] = li;
            stage.addChild(li.graphic);
        });

        // Prepare the marker symbol
        markerSprite = new PIXI.Sprite.fromImage('img/marker.png');
        markerSprite.width = 50;
        markerSprite.height = 50;
        stage.addChild(markerSprite);
        markerSprite.visible = false;
    }

    function prepareLegend() {
        var w = 300, h = 120;
        var key = d3.select('#velLegend').append('svg').attr('id', 'key').attr('width', w).attr('height', h);
        var legend = key.append('defs').append('svg:linearGradient').attr('id', 'gradient').attr('x1', '0%').attr('y1', '100%').attr('x2', '100%').attr('y2', '100%').attr('spreadMethod', 'pad');
        legend.append('stop').attr('offset', '0%').attr('stop-color', 'blue').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '50%').attr('stop-color', 'lime').attr('stop-opacity', 1);
        legend.append('stop').attr('offset', '100%').attr('stop-color', 'red').attr('stop-opacity', 1);
        key.append('rect').attr('width', w - 100).attr('height', h - 100).style('fill', 'url(#gradient)');
        var color = key.append('g').attr('class', 'x axis').attr('transform', 'translate(0,22)');
        color.append('text').attr('y', 42).attr('dx', '.71em').style('text-anchor', 'start').text('Velocity (m/s)');        
        return color;
    }

    function updateLegend(minVel, maxVel) {
        var x = d3.scale.linear().range([0, 200]).domain([minVel, maxVel]);
        var xAxis = d3.svg.axis().scale(x).ticks(4).orient('bottom');
        colorLegend.call(xAxis);
    }

    function updateLineColor(line, color){
        var len = line.graphicsData.length;
        for (var i = 0; i < len; i++) {
            var data = line.graphicsData[i];
            data.lineColor = color;
        }
        line.dirty = true;
        line.clearDirty = true;
    }

    /*
     * This function runs under a timer. It is in charge of rendering the canvas.
     * Do not call this directly.
     */
    function animate() {
        if(!isDataReady) return;

        // Animate the stuff here (transitions, color updates etc.)
        var rectSize = x(10) - x(0);
        $scope.tData.Data.forEach(function(d, i) {
            // TODO: more elegant sampling
            if (isNaN(d.x)) return;
            if (i % 10 != 0) return;
            if(Time.tIndex >= d.value.length) return;

            var value = d.value[Time.tIndex];

            if(!value) return;
            
            var angle = Math.atan2(-value[1], value[0]);
            lines[i].graphic.rotation = angle;

            //var s = 100*norm(value);
              //lines[i].graphic.scale.x = s < 0.1 ? 0 : s;// 1000*norm(value);

            var color = parseInt(c(norm(value)).toString().replace('#', '0x'));
            lines[i].graphic.children.forEach(function(line){
                updateLineColor(line, color);
            });
        })

        // DEPRECATED: The velocity now uses a reduced spatial resolution.
        // This means that the pointIndex does not represent a correct index
        // anymore. Either recalculate the correct index or leave this portion
        // commented...

        // Put the marker sprite at the correct position
        /*markerSprite.visible = $scope.pointIndex != undefined;
        if($scope.pointIndex != undefined) {
            markerSprite.position.x = x($scope.tData.Data[$scope.pointIndex].x) - markerSprite.width / 2;
            markerSprite.position.y = y($scope.tData.Data[$scope.pointIndex].y) - markerSprite.height / 2;
        }*/

        $scope.$apply();

        // render the stage
        renderer.render(stage);

        // render the timeline on the chart
        $scope.Chart.UpdateTimeLine()
    }

    /*
     * Returns the norm of a vector.
     * The vector is expected to be an array [x,y].
     */
    function norm(vec) {
        return Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1]);
    }
});
