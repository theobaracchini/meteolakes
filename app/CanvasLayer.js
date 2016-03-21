'use strict';

L.CanvasLayer = (L.Layer ? L.Layer : L.Class).extend({

    initialize: function (data, options) {
        this._data = data;
        this._step = 0;
        this._dragging = false;
        L.setOptions(this, options);
    },

    setData: function (data) {
        this._data = data;
        return this.redraw();
    },

    setStep: function (step) {
        this._step = step;
        return this.redraw();
    },

    setOptions: function (options) {
        L.setOptions(this, options);
        this._updateOptions();
        return this.redraw();
    },

    redraw: function () {
        if (!this._frame && !this._dragging) {
            this._frame = L.Util.requestAnimFrame(this._redraw, this);
        }
        return this;
    },

    onAdd: function (map) {
        this._map = map;

        if (!this._canvas) {
            this._initCanvas();
        }

        map._panes.overlayPane.appendChild(this._canvas);

        map.on('moveend', this._reset, this);

        var self = this;
        map.on('dragstart', function() {
            self._dragging = true;
        });
        map.on('dragend', function() {
            self._dragging = false;
        });

        if (map.options.zoomAnimation && L.Browser.any3d) {
            map.on('zoomanim', this._animateZoom, this);
        }

        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._canvas);

        map.off('moveend', this._reset, this);

        if (map.options.zoomAnimation) {
            map.off('zoomanim', this._animateZoom, this);
        }
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    _initCanvas: function () {
        var canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-canvas-layer leaflet-layer');

        var size = this._map.getSize();
        canvas.width  = size.x;
        canvas.height = size.y;

        var animated = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));

        this._updateOptions();
    },

    _updateOptions: function () {
    },

    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);

        var size = this._map.getSize();

        if (this._width() !== size.x) {
            this._canvas.width = size.x;
        }
        if (this._height() !== size.y) {
            this._canvas.height = size.y;
        }

        this._redraw();
    },

    _redraw: function () {
        /*
        var data = [],
            r = this.options.radius,
            size = this._map.getSize(),
            bounds = new L.Bounds(
                L.point([-r, -r]),
                size.add([r, r])),

            cellSize = r / 2,
            grid = [],
            panePos = this._map._getMapPanePos(),
            offsetX = panePos.x % cellSize,
            offsetY = panePos.y % cellSize,
            i, len, p, cell, x, y, j, len2;

        for (i = 0, len = this._data.length; i < len; i++) {
            p = this._map.latLngToContainerPoint(this._data[i]);
            if (bounds.contains(p)) {
                x = Math.floor((p.x - offsetX) / cellSize) + 2;
                y = Math.floor((p.y - offsetY) / cellSize) + 2;

                var value = this._values[i] !== undefined ? +this._values[i] : 1;

                grid[y] = grid[y] || [];
                cell = grid[y][x];

                if (!cell) {
                    grid[y][x] = [p.x, p.y, value, 1];

                } else {
                    cell[0] += p.x; // x
                    cell[1] += p.y; // y
                    cell[2] += value;
                    cell[3]++;
                }
            }
        }

        for (i = 0, len = grid.length; i < len; i++) {
            if (grid[i]) {
                for (j = 0, len2 = grid[i].length; j < len2; j++) {
                    cell = grid[i][j];
                    if (cell) {
                        data.push([
                            cell[0] / cell[3],
                            cell[1] / cell[3],
                            cell[2] / cell[3]
                        ]);
                    }
                }
            }
        }


        var data = [];
        var r = this.options.radius;
        var size = this._map.getSize();
        var bounds = new L.Bounds(L.point([-r, -r]), size.add([r, r]));

        for (var i = 0; i < this._data.length; i++) {
            var p = this._map.latLngToContainerPoint(this._data[i]);
            if (bounds.contains(p)) {
                data.push([p.x, p.y, this._values[i]])
            }
        }
        */

        /*
        TODO
        - cache results of latLngToContainerPoint
        - only draw data within bounds
        - optionally simplify data
        */

        var self = this;
        this._draw(function(p) {
            return self._map.latLngToContainerPoint([p.lat, p.lng]);
        });

        this._frame = null;
    },

    _width: function() {
        return this._canvas.width;
    },

    _height: function() {
        return this._canvas.height;
    },

    _draw: function (p) {
        var ctx = this._canvas.getContext('2d');

        ctx.clearRect(0, 0, this._width(), this._height());

        for (var i = 0; i < this._data.length - 1; i++) {
            var row = this._data[i];
            var nextRow = this._data[i + 1];
            for (var j = 0; j < row.length - 1; j++) {
                if (row[j] && row[j + 1] && nextRow[j] && nextRow[j + 1]) {
                    // TODO correct 1/2 cell shift
                    var topLeftValue = row[j].values[this._step];
                    var color = this.options.colorFunction(topLeftValue);

                    var p00 = p(row[j]);
                    var p01 = p(row[j + 1]);
                    var p10 = p(nextRow[j]);
                    var p11 = p(nextRow[j + 1]);
                    ctx.beginPath();
                    ctx.moveTo(p00.x, p00.y);
                    ctx.lineTo(p01.x, p01.y);
                    ctx.lineTo(p11.x, p11.y);
                    ctx.lineTo(p10.x, p10.y);
                    ctx.closePath();
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.stroke();

                    // this._drawCircle(p00.x, p00.y, 5, 'green');
                }
            }
        }
/*
        for (var i = 0, len = this._data.length, p; i < len; i++) {
            p = this._data[i];
            var color = (colorFunction !== undefined) ? colorFunction(p[2]) : 'green';
            this._drawCircle(p[0], p[1], 5, color);
        }

        var colored = ctx.getImageData(0, 0, this._width, this._height);
        var pixels = colored.data;
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            if (pixels[i + 3]) {
                pixels[i + 3] = 255;
            }
        }
        ctx.putImageData(colored, 0, 0);
        */

        return this;
    },

    _drawCircle: function (x, y, r, color) {
        var ctx = this._canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    },

    _animateZoom: function (e) {
        var scale = this._map.getZoomScale(e.zoom),
            offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

        if (L.DomUtil.setTransform) {
            L.DomUtil.setTransform(this._canvas, offset, scale);

        } else {
            this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
        }
    }
});

L.canvasLayer = function (data, options) {
    return new L.CanvasLayer(data, options);
};
