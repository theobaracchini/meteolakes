var app = angular.module('lakeViewApp');

// TODO: split up into services with meaningful topics

app.factory('misc', function() {
    function PrepareSvgCanvas(containerId, aspectRatio) {
        return Prepare('svg', containerId, aspectRatio);
    }

    function Prepare(type, containerId, aspectRatio) {
        var container = d3.select(containerId);

        var dim = findDimensions(container, aspectRatio);
        container.style('height', dim.height);

        return {svg:container.append(type).attr('width', dim.width).attr('height', dim.height), width:dim.width, height:dim.height};
    }

    function findDimensions(container, aspectRatio) {
        var width = parseInt(container.style('width'));

        // adapt the height to fit the given width
        return {width:width, height:width/aspectRatio};
    }

    /*
     * Returns the norm of a vector.
     * The vector is expected to be an array [x,y].
     */
    function norm(vec) {
        return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    }

    return {
        PrepareSvgCanvas: PrepareSvgCanvas,
        norm: norm
    };
});
