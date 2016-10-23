angular.module('lakeViewApp').factory('NearestNeighbor', function(rbush, knn) {
    return function(data) {
        // Initialize nearest neighbor data structure
        var knnData = [];
        data.map(function(d, i, j) {
            knnData.push({
                x: d.x,
                y: d.y,
                i: i,
                j: j
            });
        });
        var knnTree = rbush(9, ['.x', '.y', '.x', '.y']);
        knnTree.load(knnData);

        return {
            query: function(point) {
                return knn(knnTree, [point.x, point.y], 1)[0];
            }
        };
    };
});
