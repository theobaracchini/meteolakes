var app = angular.module('lakeViewApp');

app.factory('CanvasLayer', function(misc) {
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

            this._updateLatLngToPixel();

            this._redraw();
        },

        _updateLatLngToPixel: function () {
            for (var i = 0; i < this._data.length; i++) {
                var row = this._data[i];
                for (var j = 0; j < row.length; j++) {
                    var d = row[j];
                    if (d) {
                        d.p = this._map.latLngToContainerPoint([d.lat, d.lng]);
                    }
                }
            }
        },

        _redraw: function () {
            if (this.options.simplify) {
                var ctx = this._canvas.getContext('2d');
                ctx.clearRect(0, 0, this._width(), this._height());

                var r = this.options.radius,
                    size = this._map.getSize(),
                    bounds = new L.Bounds(
                        L.point([-r, -r]),
                        size.add([r, r])),

                    cellSize = r / 2,
                    grid = [],
                    panePos = this._map._getMapPanePos(),
                    offsetX = panePos.x % cellSize,
                    offsetY = panePos.y % cellSize,
                    i, len, d, p, cell, x, y, j, len2;

                for (i = 0, len = this._data.length; i < len; i++) {
                    var row = this._data[i];
                    for (var j = 0; j < row.length; j++) {
                        d = row[j];
                        if (d) {
                            if (bounds.contains(d.p)) {
                                x = Math.floor((d.p.x - offsetX) / cellSize) + 2;
                                y = Math.floor((d.p.y - offsetY) / cellSize) + 2;

                                var value = d.values[this._step];

                                if (value) {
                                    grid[y] = grid[y] || [];
                                    cell = grid[y][x];

                                    // TODO move velocity-specific simplification code elsewhere
                                    if (!cell) {
                                        grid[y][x] = [d.p.x, d.p.y, value[0], value[1], 1];
                                    } else {
                                        cell[0] += d.p.x;
                                        cell[1] += d.p.y;
                                        cell[2] += value[0];
                                        cell[3] += value[1];
                                        cell[4]++;
                                    }
                                }
                            }
                        }
                    }
                }

                for (i = 0, len = grid.length; i < len; i++) {
                    if (grid[i]) {
                        for (j = 0, len2 = grid[i].length; j < len2; j++) {
                            cell = grid[i][j];
                            if (cell) {
                                var x = cell[0] / cell[4];
                                var y = cell[1] / cell[4];
                                var dx = cell[2] / cell[4]
                                var dy = cell[3] / cell[4]
                                var color = this.options.colorFunction(misc.norm([dx, dy]));

                                // TODO use max velocity to determine scale factor
                                this._drawArrow(x, y, dx * 500, -dy * 500, color);
                            }
                        }
                    }
                }
            } else {
                this._draw();
            }

            this._frame = null;
        },

        _width: function() {
            return this._canvas.width;
        },

        _height: function() {
            return this._canvas.height;
        },

        _draw: function () {
            var ctx = this._canvas.getContext('2d');

            ctx.clearRect(0, 0, this._width(), this._height());

            var bounds = new L.Bounds(
                        L.point([0, 0]),
                        this._map.getSize());

            for (var i = 0; i < this._data.length - 1; i++) {
                var row = this._data[i];
                var nextRow = this._data[i + 1];
                for (var j = 0; j < row.length - 1; j++) {
                    if (row[j] && row[j + 1] && nextRow[j] && nextRow[j + 1]) {
                        if (bounds.contains(row[j].p)) {
                            // TODO correct 1/2 cell shift
                            var topLeftValue = row[j].values[this._step];
                            var color = this.options.colorFunction(topLeftValue);

                            var p00 = row[j].p;
                            var p01 = row[j + 1].p;
                            var p10 = nextRow[j].p;
                            var p11 = nextRow[j + 1].p;
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
                        }
                    }
                }
            }

            return this;
        },

        _drawArrow: function (x, y, dx, dy, color) {
            var fromx = x;
            var fromy = y;
            var tox = x + dx;
            var toy = y + dy;

            var ctx = this._canvas.getContext('2d');

            var headlen = 10;   // length of head in pixels
            var angle = Math.atan2(toy - fromy, tox - fromx);
            ctx.beginPath();
            ctx.moveTo(fromx, fromy);
            ctx.lineTo(tox, toy);
            ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(tox, toy);
            ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.stroke();
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

    return {};
});
