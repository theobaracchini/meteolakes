angular.module('meteolakesApp').service('InsituDataIndex', function($q, DATA_HOST, DATA_WEATHER_STATION, DataFile) {
    this.dataSeries = {};
    this.dataPeriods = {};
    this.availableData = {};

    this.load = function() {
        var me = this;
        // Read the two json files
        return $q(function(resolve, reject) {
            d3.json(DATA_HOST + DATA_WEATHER_STATION + '/available_data.json', function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    me.availableData = data;
                    me.parse();
                    resolve();
                }
            });
        });
    };

    this.parse = function() {
        var me = this;
        Object.keys(me.availableData).forEach(function(dSeries) {
            var curSeries = me.availableData[dSeries];
            // TODO: Not sure if this validation has any value, maybe remove it
            var fColumns = curSeries.columns.map(function(col) {
                if (typeof col !== 'string') {
                    return null;
                }
                return col;
            });
            curSeries.columns = fColumns;
            curSeries.dataFiles = {};
            curSeries.data.forEach(function(date) {
                // TODO: Validate the availability month,
                // add error handling for invalid data
                var period = moment(date, 'YYYY-MM');
                // if (!period.isValid()) { ... }
                if (typeof me.dataPeriods[period.year()] === 'undefined') {
                    me.dataPeriods[period.year()] = [];
                }
                if (me.dataPeriods[period.year()].indexOf(period.month()) === -1) {
                    me.dataPeriods[period.year()].push(period.month());
                }
                // Initialize a data file
                me.availableData[dSeries].dataFiles[date] =
                 new DataFile(dSeries, period.year(), period.month());
            });
        });
    };

    // Find all data series that contain the given column and have files available
    // within the given date range. Return an array of all matching DataFile objects.
    this.getFilesByColumn = function(col, startDate, endDate) {
        var me = this;
        var curDate = startDate.clone();
        var matches = [];
        do {
            Object.keys(me.availableData).forEach(function(dSeries) {
                var colIndex = me.availableData[dSeries].columns.indexOf(col);
                if (colIndex !== -1) {
                    var dateIndex = curDate.format('YYYY-MM');
                    if (dateIndex in me.availableData[dSeries].dataFiles) {
                        var curFile = me.availableData[dSeries].dataFiles[dateIndex];
                        matches.push(curFile);
                    }
                }
            });
            curDate.add(1, 'month');
        } while (curDate.year() < endDate.year() || (curDate.year() === endDate.year()
            && curDate.month() <= endDate.month()));

        return matches;
    };
});
