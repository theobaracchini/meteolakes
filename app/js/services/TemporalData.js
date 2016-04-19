angular.module('lakeViewApp').factory('TemporalData', function(DATA_HOST, $q) {
    var TemporalData = function(fieldName) {
        this.fieldName = fieldName;
        this.DataTime = {};
    }

    TemporalData.prototype.map = function(fn) {
        return this.Data.map(function(d) {
            return d.map(function(d0) {
                return d0 ? fn(d0) : null;
            });
        });
    }

    TemporalData.prototype.SwitchToData = function(week, year) {
        this.DataTime.Year = year;
        this.DataTime.Week = week;

        return this;
    }

    TemporalData.prototype.readData = function(dataFolder, week, year) {
        var me = this;

        return $q(function(resolve, reject) {
            var valuesFile = DATA_HOST + dataFolder + '/' + year + '/' + me.fieldName + '/data_week' + week + '.csv'; 

            // Read the data config
            d3.json(valuesFile + '.json', function(err, config) {
                if(err) {
                    reject('File not found: ' + valuesFile);
                } else {
                    me.readArray(valuesFile, config).then(resolve);
                }
            });
        });
    }

    TemporalData.prototype.readArray = function(file, config) {
        var me = this;

        return $q(function(resolve, reject) {
            d3.text(file, function(err, data) {
                if(err) {
                    reject('File not found: ' + file);
                } else {
                    me.parseCSV(config, data);
                    me.recomputeBounds();
                    resolve();
                }
            });
        });
    }

    TemporalData.prototype.parseCSV = function(config, data) {
        var me = this;

        this.flatArray = [];
        this.Data = d3.csv.parseRows(data, function(row) {
            var parsedRow = [];
            for (var i = 0; i < config.GridHeight; i++) {
                var x = +row[i];
                var y = +row[config.GridHeight + i];
                if (isNaN(x) || isNaN(y)) {
                    // No data for this cell
                    parsedRow.push(null);
                } else {
                    var values = [];
                    var hasNaN = false;
                    // Get values for all time steps
                    for (var j = 0; j < config.Timesteps; j++) {
                        var value = [];
                        for (var k = 0; k < config.NumberOfValues; k++) {
                            var v = +row[(2 + k * config.Timesteps + j) * config.GridHeight + i];
                            if (isNaN(v)) {
                                hasNaN = true;
                            }
                            value.push(v);
                        }
                        if (config.NumberOfValues == 1) {
                            value = value[0];
                        }
                        values.push(value);
                    }
                    if (hasNaN) {
                        // No data for this cell
                        parsedRow.push(null);
                    } else {
                        var entry = {
                            x: x,
                            y: y,
                            values: values
                        };
                        me.flatArray.push(entry);
                        parsedRow.push(entry);
                    }
                }
            }
            return parsedRow;
        });
    }

    TemporalData.prototype.recomputeBounds = function() {
        this.xMin = d3.min(this.flatArray, function(d) { return d.x });
        this.xMax = d3.max(this.flatArray, function(d) { return d.x });

        this.yMin = d3.min(this.flatArray, function(d) { return d.y });
        this.yMax = d3.max(this.flatArray, function(d) { return d.y });
    }

    return TemporalData;
});
