angular.module('lakeViewApp').service('Util', function() {
    /**
      * finds the entry closest to <query> in <collection>
      */
    this.closest = function(collection, query, returnIndex) {
        var minDiff = Number.MAX_VALUE;
        var result;
        var resultIndex;
        collection.forEach(function(entry, i) {
            var diff = Math.abs(entry - query);
            if (diff < minDiff) {
                minDiff = diff;
                result = entry;
                resultIndex = i;
            }
        });
        if (returnIndex) {
            return resultIndex;
        } else {
            return result;
        }
    };

    /**
      * Returns the norm of a vector.
      * The vector is expected to be an array [x, y].
      */
    this.norm = function(vec) {
        return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    };
});
