angular.module('meteolakesApp').service('ShowCoordinates', function() {
    L.Control.ShowCoordinates = L.Control.extend({
        options: {
            position: 'bottomleft',
            format: function(latlng) { return latlng; }
        },

        initialize: function(options) {
            L.setOptions(this, options);
        },

        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'leaflet-control-attribution');
            map.on('mousemove', this._update, this);
            return this._container;
        },

        onRemove: function(map) {
            map.off('mousemove', this._update, this);
        },

        _update: function(evt) {
            var latlng = evt.latlng;
            if (latlng) {
                this._container.innerHTML = this.options.format(latlng);
            }
        }
    });

    L.control.showcoordinates = function(options) {
        return new L.Control.ShowCoordinates(options);
    };
});
