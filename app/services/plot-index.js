angular.module('meteolakesApp').service('PlotIndex', function($q, DATA_HOST, DATA_WEATHER_STATION, InsituDataIndex) {
    this.plots = [];

    this.load = function() {
        var me = this;
        // Read the json file
        return $q(function(resolve, reject) {
            d3.json(DATA_HOST + DATA_WEATHER_STATION + '/plots.json', function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    me.plots = data;
                    me.parse();
                    resolve();
                }
            });
        });
    };

    this.parse = function() {
        // TODO
    };


    // Load all data files required to display the plots for the given start date
    // and time period, then retrieve the desired columns and crop
    // them to the appropriate date range
    this.loadPlotData = function(startDate, period) {
        var me = this;
        var loadingFiles = [];
        var processing = [];
        var endDate = startDate.clone().add(period, 'days').endOf('day');
        // search files needed
        var dataFiles = new Set();
        me.plots.forEach(function(plot) {
            plot.columns.forEach(function(col) {
                var files = InsituDataIndex.getFilesByColumn(col.name, startDate, endDate);
                files.forEach(function(file) {
                    dataFiles.add(file);
                });
                col.files = files.map(function(file) {
                    return file.series;
                });
            });
        });
        // Load files data
        dataFiles.forEach(function(file) {
            if (!(file.loading || file.ready)) {
                // Asynchronously load the files
                var q = file.readData();
                loadingFiles.push(q);
            }
        });

        // After we've read the files, we add data data of each column in the plot
        // (For simplicity, we wait for ALL files we've started loading so far)
        var r = $q.all(loadingFiles).then(function() {
            me.plots.forEach(function(plot) {
                plot.columns.forEach(function(col) {
                    // Extract the needed column data, concatenated from all files
                    var files = [];
                    dataFiles.forEach(function(file) {
                        if (col.files.includes(file.series)) {
                            files.push(file);
                        }
                    });
                    // Sort files by timestamp of first/last row
                    // Assuming the data within files is sorted and date ranges
                    // don't intersect, we will get out sorted data
                    files.sort(function(a, b) {
                        if (a.data[0].date > b.data[b.data.length - 1].date) {
                            return 1;
                        }
                        if (b.data[0].date > a.data[a.data.length - 1].date) {
                            return -1;
                        }
                        return 0;
                    });
                    col.data = [];
                    files.forEach(function(file) {
                        file.data.forEach(function(row, idx) {
                            var val = row[col.name];
                            // avoid NaN in plot data
                            if (!isFinite(val) || val === '') {
                                console.warn('Invalid number: "' + val + '" in file "' + file.getFileURL() + '", line ' + (idx + 1) + ', column "' + col.name + '"');
                            } else if (row.date >= startDate && row.date <= endDate) {
                                // Data point is valid and within exact range
                                col.data.push({ date: row.date, value: parseFloat(val) });
                            }
                        });
                    });
                    if (files.length > 0) {
                        col.unit = files[0].units[col.name]; // Take unit from first file
                    }
                });
                processing.push(r);
            });
        });

        return $q.all(processing); // resolves when all files have been processed
    };
});
