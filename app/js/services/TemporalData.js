angular.module('lakeViewApp').factory('TemporalData', function(DATA_HOST, $q, DateHelpers) {
    var TemporalData = function(fieldName) {
        this.fieldName = fieldName;
        this.timeSteps = [];
        this.Data = [];
    }

    TemporalData.prototype.map = function(fn) {
        return this.Data.map(function(d, i) {
            return d.map(function(d0, j) {
                return d0 ? fn(d0, i, j) : null;
            });
        });
    }

    TemporalData.prototype.readData = function(selection) {
        var me = this;
        var year = selection.year;
        var week = selection.week;

        return $q(function(resolve, reject) {
            var valuesFile = DATA_HOST + selection.folder + '/' + year + '/' + me.fieldName + '/data_week' + week + '.csv'; 

            // Read the data config
            d3.json(valuesFile + '.json', function(err, config) {
                if(err) {
                    reject('File not found: ' + valuesFile);
                } else {
                    me.readArray(valuesFile, config).then(function() {
                        me.resetBounds();
                        me.timeSteps = me.computeTimeSteps(selection);
                        resolve();
                    });
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

    TemporalData.prototype.resetBounds = function() {
        this.xMin = d3.min(this.flatArray, function(d) { return d.x });
        this.xMax = d3.max(this.flatArray, function(d) { return d.x });

        this.yMin = d3.min(this.flatArray, function(d) { return d.y });
        this.yMax = d3.max(this.flatArray, function(d) { return d.y });
    }

    TemporalData.prototype.computeTimeSteps = function(selection) {
        var result = [];
        var noValues = this.flatArray[0].values.length;
        var start = DateHelpers.firstDayOfWeek(selection.week, selection.year);
        for (var i = 0; i < noValues; i++) {
            var step = moment(start).add(i * selection.interval, 'minutes');
            result.push(step);
        }
        return result;
    }

    TemporalData.prototype.withTimeSteps = function(values) {
        var resultLength = Math.min(values.length, this.timeSteps.length);
        var result = [];
        for (var i = 0; i < resultLength; i++) {
            result.push({
                date: this.timeSteps[i],
                value: values[i]
            });
        }
        return result;
    }

    return TemporalData;
});
