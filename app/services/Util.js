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
        }
        return result;
    };

    /**
      * Returns the norm of a vector of length 1 or 2.
      */
    this.norm = function(vec) {
        if (vec.length === 2) {
            return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
        }
        return vec;
    };
});
