angular.module('lakeViewApp').service('CanvasLayer', function() {
    L.CanvasLayer = (L.Layer ? L.Layer : L.Class).extend({
        initialize: function(options) {
            this._dragging = false;
            L.setOptions(this, options);
        },

        setData: function(data) {
            this._data = data;
            return this._reset();
        },

        setDrawFunction: function(drawFunction) {
            this._drawFunction = drawFunction;
        },

        redraw: function() {
            if (this._canvas && !this._frame && !this._dragging) {
                this._frame = L.Util.requestAnimFrame(this._redraw, this);
            }
            return this;
        },

        onAdd: function(map) {
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

        onRemove: function(map) {
            map.getPanes().overlayPane.removeChild(this._canvas);

            map.off('moveend', this._reset, this);

            if (map.options.zoomAnimation) {
                map.off('zoomanim', this._animateZoom, this);
            }
        },

        addTo: function(map) {
            map.addLayer(this);
            return this;
        },

        _initCanvas: function() {
            var size = this._map.getSize();

            this._container = new PIXI.Container();
            this._renderer = PIXI.autoDetectRenderer(size.x, size.y, {transparent: true, antialias: true});
            this._canvas = this._renderer.view;

            var animated = this._map.options.zoomAnimation && L.Browser.any3d;
            L.DomUtil.addClass(this._canvas, 'leaflet-canvas-layer');
            L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));
        },

        _reset: function() {
            var topLeft = this._map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(this._canvas, topLeft);

            var size = this._map.getSize();
            this._renderer.resize(size.x, size.y);

            this._updateLatLngToPixel();

            this._redraw();
        },

        _updateLatLngToPixel: function() {
            if (this._data) {
                for (var i = 0; i < this._data.length; i++) {
                    var row = this._data[i];
                    for (var j = 0; j < row.length; j++) {
                        var d = row[j];
                        if (d) {
                            d.p = this._map.latLngToContainerPoint([d.lat, d.lng]);
                        }
                    }
                }
            }
        },

        _redraw: function() {
            var self = this;

            for (var i = this._container.children.length - 1; i >= 0; i--) {
                this._container.removeChild(this._container.children[i]);
            };

            if (this._data && this._drawFunction) {
                var options = {
                    size: this._map.getSize(),
                    background: this.options.background,
                    dataSource: this.options.dataSource,
                    project: function(p) {
                        return self._map.latLngToContainerPoint(p);
                    }
                };
                this._container.addChild(this._drawFunction(this._data, options));
            }

            this._renderer.render(this._container);

            this._frame = null;
        },

        _width: function() {
            return this._canvas.width;
        },

        _height: function() {
            return this._canvas.height;
        },

        _animateZoom: function(e) {
            var scale = this._map.getZoomScale(e.zoom);
            var offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

            if (L.DomUtil.setTransform) {
                L.DomUtil.setTransform(this._canvas, offset, scale);
            } else {
                this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
            }
        }
    });

    L.canvasLayer = function(options) {
        return new L.CanvasLayer(options);
    };
});
