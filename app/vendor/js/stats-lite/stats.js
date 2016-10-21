angular.module('stats').service('stats', function() {
  
  // This was an npm package called stats-lite, converted to a simple 3rd party module to avoid need for browserify
  
  this.isNumber = function(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
  }

  this.numbers = function(vals) {
    var nums = [];
    if (vals == null)
      return nums;

    for (var i = 0; i < vals.length; i++) {
      if (this.isNumber(vals[i]))
        nums.push(+vals[i]);
    }
    return nums;
  }

  this.nsort = function(vals) {
    return vals.sort(function numericSort(a, b) { return a - b });
  }

  this.sum = function(vals) {
    vals = this.numbers(vals);
    var total = 0;
    for (var i = 0; i < vals.length; i++) {
      total += vals[i];
    }
    return total;
  }

  this.mean = function(vals) {
    vals = this.numbers(vals);
    if (vals.length === 0) return NaN;
    return (this.sum(vals) / vals.length);
  }

  this.median = function(vals) {
    vals = this.numbers(vals);
    if (vals.length === 0) return NaN;

    var half = (vals.length / 2) | 0;

    vals = this.nsort(vals);
    if (vals.length % 2) {
      // Odd length, true middle element
      return vals[half];
    }
    else {
      // Even length, average middle two elements
      return (vals[half-1] + vals[half]) / 2.0;
    }
  }

  // Returns the mode of a unimodal dataset
  // If the dataset is multi-modal, returns a Set containing the modes
  this.mode = function(vals) {
    vals = this.numbers(vals);
    if (vals.length === 0) return NaN;
    var mode = NaN;
    var dist = {};

    for (var i = 0; i < vals.length; i++) {
      var value = vals[i];
      var me = dist[value] || 0;
      me++;
      dist[value] = me;
    }

    var rank = this.numbers(Object.keys(dist).sort(function sortMembers(a, b) { return dist[b] - dist[a] }));
    mode = rank[0];
    if (dist[rank[1]] == dist[mode]) {
      // multi-modal
      if (rank.length == vals.length) {
        // all values are modes
        return vals;
      }
      var modes = new Set([mode]);
      var modeCount = dist[mode];
      for (var i = 1; i < rank.length; i++) {
        if (dist[rank[i]] == modeCount) {
          modes.add(rank[i]);
        }
        else {
          break;
        }
      }
      return modes;
    }
    return mode;
  }

  // Variance = average squared deviation from mean
  this.variance = function(vals) {
    vals = this.numbers(vals);
    var avg = this.mean(vals);
    var diffs = [];
    for (var i = 0; i < vals.length; i++) {
      diffs.push(Math.pow((vals[i] - avg), 2));
    }
    return this.mean(diffs);
  }

  // Standard Deviation = sqrt of variance
  this.stdev = function(vals) {
    return Math.sqrt(this.variance(vals));
  }

  this.percentile = function (vals, ptile) {
    vals = this.numbers(vals);
    if (vals.length === 0 || ptile == null || ptile < 0) return NaN;

    // Fudge anything over 100 to 1.0
    if (ptile > 1) ptile = 1;
    vals = this.nsort(vals);
    var i = (vals.length * ptile) - 0.5;
    if ((i | 0) === i) return vals[i];
    // interpolated percentile -- using Estimation method
    var int_part = i | 0;
    var fract = i - int_part;
    return (1 - fract) * vals[int_part] + fract * vals[Math.min(int_part + 1, vals.length - 1)];
  }

});
