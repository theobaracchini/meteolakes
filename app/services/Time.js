// Factory for a shared time index variable, so that all
// graphs can access it
angular.module('meteolakesApp').factory('Time', function() {
    return {
        tIndex: 0,
        nSteps: 7 * 24 * 60, // number of time steps in a week
        increase: function(loop) {
            if (loop) {
                this.tIndex ++;
                if (this.tIndex >= this.nSteps) {
                    this.tIndex = 0;
                }
            } else {
                this.tIndex = Math.min(this.nSteps - 1, this.tIndex + 1);
            }
        },
        decrease: function() {
            this.tIndex = Math.max(0, this.tIndex - 1);
        }
    };
});
