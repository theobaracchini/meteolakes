var app = angular.module('lakeViewApp');

// Factory for a shared time index variable, so that all 
// graphs can access it
app.factory('Time', function() {
    return { 
        tIndex: 0,
        nT: 7*24*60, // number of time steps in a week
        increase: function(loop) {
            if(loop) {
                this.tIndex ++;
                if(this.tIndex >= this.nT)
                    this.tIndex = 0;
            } else
                this.tIndex = Math.min(this.nT-1, this.tIndex+1);
        },
        decrease: function() {
            this.tIndex = Math.max(0, this.tIndex-1);
        },
        recomputeTimesteps: function(interval) {
            this.nT = 7*24*60/interval;
        }
    };
});
