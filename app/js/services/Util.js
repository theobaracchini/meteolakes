angular.module('lakeViewApp').service('Util', function() {
    /**
      * finds the entry closest to <query> in <collection>
      */
    this.closest = function(collection, query) {
        var minDiff = Number.MAX_VALUE;
        var result;
        collection.forEach(function(entry) {
            var diff = Math.abs(entry - query);
            if(diff < minDiff) {
                minDiff = diff;
                result = entry;
            }
        });
        return result;
    }

    /**
      * Returns the norm of a vector.
      * The vector is expected to be an array [x, y].
      */
    this.norm = function(vec) {
        return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
    }
});
