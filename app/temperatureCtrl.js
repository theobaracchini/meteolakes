var app = angular.module("lakeViewApp");

app.controller("temperatureCtrl", ["$rootScope", "$scope", "Time", function($rootScope, $scope, Time) {
    // TODO: get rid of non-Angular dependencies
    var Chart = require('./models/chart');
    var misc = require('./misc');
    var TemporalData = require('./models/temporalData');

    // ========================================================================
    // PROPERTIES
    // ========================================================================

    var webgl = misc.PrepareWebGLContext("#tempContainer", true, 2);
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

    var crs;
    var map;
    var circles;
    var heatLayer;

    Initialize();
    initMap();

    // ========================================================================
    // INIT (I know, code above is also some initialization. Deal with it.)
    // ========================================================================
    function Initialize() {
        $rootScope.$on("reloadWeek", function(evt, time) {
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
                $scope.tData = new TemporalData(time.folder, 'temperature');
                $scope.tData.PrepareData(time.week, time.year, function() {
                    $scope.tData.SwitchToData(time.week, time.year);

                    dataReady();
                    prepareGraphics();

                    // Load the next file if available
                    if(time.weeks.indexOf(time.week+1) != -1)
                        $scope.tData.PrepareData(time.week+1, time.year, function() {});
                });
            }
        })

        $scope.Chart = new Chart($scope, Time, "#tempPlot", function(d) { return d })
        $rootScope.$on("reloadChart", function(evt, pointIndex) {
            $scope.Chart.SelectPoint(pointIndex);
        })

        $rootScope.$on("tick", function() {
            animate();
        })
        // start the renderer
        // d3.timer(animate);

        $rootScope.$emit("scopeReady");        
    }

    function initMap() {
        // Definition for projected coordinate system CH1903 / LV03
        // Source: https://epsg.io/21781.js
        proj4.defs("EPSG:21781","+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.4,15.1,405.3,0,0,0,0 +units=m +no_defs");

        var res = [4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5];

        var scale = function(zoom) {
            return 1 / res[zoom];
        };

        crs = new L.Proj.CRS('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs', {
            resolutions: res,
            origin: [420000, 350000]
        });

        console.log(crs);

        map = new L.Map('map', {
            crs: crs,
            continuousWorld: true,
            worldCopyJump: false,
            scale: scale
        });

        var mapUrl = 'https://wmts6.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/21781/{z}/{y}/{x}.jpeg',
        attrib = 'Map data &copy; 2015 swisstopo',
        tilelayer = new L.TileLayer(mapUrl, {
            scheme: 'xyz',
            maxZoom: res.length - 1,
            minZoom: 0,
            opacity: 0.75,
            continuousWorld: true,
            attribution: attrib
        });

        map.addLayer(tilelayer);

        var lemanCenter = L.point(530000, 140000);
        map.setView(crs.projection.unproject(lemanCenter), 17);
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function dataReady() {
        var xmargin = width*0.1;
        var ymargin = height*0.1;
        x = d3.scale.linear().domain([$scope.tData.xMin, $scope.tData.xMax]).range([0+xmargin, width-xmargin]);
        y = d3.scale.linear().domain([$scope.tData.yMin, $scope.tData.yMax]).range([height-ymargin, 0+ymargin]);

        var tMin = d3.min($scope.tData.Data.map(function(d) { return d3.min(d.value) }));
        var tMax = d3.max($scope.tData.Data.map(function(d) { return d3.max(d.value) }));

        c = d3.scale.linear().domain([tMin, (tMin+tMax)/2, tMax]).range(["blue", "lime", "red"]);

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

        circles = [];
        var heatData = [];

        $scope.tData.Data.forEach(function(d, i) {
            var doc = misc.rectangle(x(d.x)-rectSize/2, y(d.y)-rectSize/2,
                rectSize,rectSize,
                parseInt(c(d.value[Time.tIndex]).toString().replace("#", "0x")));
            stage.addChild(doc.graphic);
            sprites[i] = doc;
            sprites[i].sprite.interactive = true;
            sprites[i].sprite.mousedown = function(mouseData) { $rootScope.$emit("reloadChart", i); mouseDown = true; }
            sprites[i].sprite.mouseover = function(mouseData) { if(!mouseDown) return; $rootScope.$emit("reloadChart", i); }
            sprites[i].sprite.mouseup = function(mouseData) { mouseDown = false; }

            if (!isNaN(d.x)) {
                var point = crs.projection.unproject(L.point(d.x, d.y));
                var circle = L.circle(point, 300, {
                    stroke: false,
                    fillColor: '#f03',
                    fillOpacity: 1,
                    clickable: false
                });
                // circle.addTo(map);
                // circles.push(circle);

                heatData.push([point.lat, point.lng]);
            }
        })

        heatLayer = L.heatLayer(heatData, {radius: 20, colorFunction: c});
        heatLayer.addTo(map);

        // Prepare the marker symbol
        markerSprite = new PIXI.Sprite.fromImage("img/marker.png");
        markerSprite.width = 50;
        markerSprite.height = 50;
        stage.addChild(markerSprite);
        markerSprite.visible = false;

        animate();
    }

    function prepareLegend() {
        var w = 300, h = 120;
        key = d3.select("#tempLegend").append("svg").attr("id", "key").attr("width", w).attr("height", h);
        legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
        legend.append("stop").attr("offset", "0%").attr("stop-color", "blue").attr("stop-opacity", 1);
        legend.append("stop").attr("offset", "50%").attr("stop-color", "lime").attr("stop-opacity", 1);
        legend.append("stop").attr("offset", "100%").attr("stop-color", "red").attr("stop-opacity", 1);
        key.append("rect").attr("width", w - 100).attr("height", h - 100).style("fill", "url(#gradient)")
        var color = key.append("g").attr("class", "x axis").attr("transform", "translate(0,22)");
        color.append("text").attr("y", 42).attr("dx", ".71em").style("text-anchor", "start").text("Temperature (°C)");
        return color;
    }

    function updateLegend(tMin, tMax) {
        var x = d3.scale.linear().range([0, 200]).domain([tMin, tMax]);
        var xAxis = d3.svg.axis().scale(x).ticks(4).orient("bottom");
        colorLegend.call(xAxis);
    }

    function animate() {
        if(!isDataReady) return;

        // Animate the stuff here (transitions, color updates etc.)
        var rectSize = x(700) - x(0);

        var circleId = 0;

        var values = [];

        $scope.tData.Data.forEach(function(d, i) {
            if(Time.tIndex >= d.value.length) return;
            
            var value = d.value[Time.tIndex];
            sprites[i].sprite.visible = !isNaN(d.value[Time.tIndex]);
            var color = parseInt(c(value).toString().replace("#", "0x"));
            sprites[i].sprite.tint = color;

            if (!isNaN(d.x)) {
                // circles[circleId].setStyle({
                //     fillColor: c(value).toString()
                // });
                values.push(value);
                circleId++;
            }
        });

        heatLayer.setValues(values);

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
}]);