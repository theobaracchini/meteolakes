angular.module('lakeViewApp').factory('TemporalData', function(DATA_HOST, $q, DateHelpers, stats) {
    var TemporalData = function(fieldName, suffix) {
        this.fieldName = fieldName;
        this.suffix = suffix ? suffix : '';
        this.timeSteps = [];
        this.Data = [];
        this.ready = false;
        this.available = true;
        this.valueAccessor = function(d) { return d; };
        this.cropPercentile = 0; // Percentile of data to limit color scale to
    };

    TemporalData.prototype.setValueAccessor = function(valueAccessor) {
        this.valueAccessor = valueAccessor;
    };
    
    TemporalData.prototype.setCropPercentile = function(cropPercentile) {
        this.cropPercentile = cropPercentile;
    };

    TemporalData.prototype.map = function(fn) {
        return this.Data.map(function(d, i) {
            return d.map(function(d0, j) {
                return d0 ? fn(d0, i, j) : null;
            });
        });
    };

    TemporalData.prototype.readData = function(selection) {
        this.ready = false;

        var me = this;
        var year = selection.year;
        var week = selection.week;

        return $q(function(resolve, reject) {
            var valuesFile = DATA_HOST + selection.folder + '/' + year + '/' + me.fieldName + '/data_week' + week + me.suffix + '.csv';

            // Read the data config
            d3.json(valuesFile + '.json', function(err, config) {
                if (err) {
                    me.available = false;
                    reject('File not found: ' + valuesFile);
                } else {
                    me.available = true;
                    me.parseConfig(config);
                    me.readArray(valuesFile, config).then(function() {
                        me.resetBounds();
                        me.timeSteps = me.computeTimeSteps(selection);
                        me.ready = true;
                        resolve();
                    });
                }
            });
        });
    };

    TemporalData.prototype.parseConfig = function(config) {
        if (!config.Version) {
            config.Version = 1;
        }
        // Set default values for fields that have been added in newer config file versions
        if (config.Version < 2) {
            config.NumberOfCoordinates = 2;
        }
    };

    TemporalData.prototype.readArray = function(file, config) {
        var me = this;

        return $q(function(resolve, reject) {
            d3.text(file, function(err, data) {
                if (err) {
                    reject('File not found: ' + file);
                } else {
                    me.parseCSV(config, data);
                    resolve();
                }
            });
        });
    };

    TemporalData.prototype.parseCSV = function(config, data) {
        var me = this;

        this.flatArray = [];
        this.Data = d3.csv.parseRows(data, function(row) {
            var parsedRow = [];
            for (var i = 0; i < config.GridHeight; i++) {
                var x = +row[i];
                var y = +row[config.GridHeight + i];
                if (config.NumberOfCoordinates > 2) {
                    var z = +row[2 * config.GridHeight + i];
                } else {
                    var z = -0.5;
                }
                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    // No data for this cell
                    parsedRow.push(null);
                } else {
                    var values = [];
                    var hasNaN = false;
                    // Get values for all time steps
                    for (var j = 0; j < config.Timesteps; j++) {
                        var value = [];
                        for (var k = 0; k < config.NumberOfValues; k++) {
                            var v = +row[(config.NumberOfCoordinates + k * config.Timesteps + j) * config.GridHeight + i];
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
                            z: z,
                            values: values
                        };
                        me.flatArray.push(entry);
                        parsedRow.push(entry);
                    }
                }
            }
            return parsedRow;
        });
    };

    TemporalData.prototype.resetBounds = function() {
        this.xExtent = d3.extent(this.flatArray, function(d) { return d.x; });
        this.yExtent = d3.extent(this.flatArray, function(d) { return d.y; });
        this.zExtent = d3.extent(this.flatArray, function(d) { return d.z; });

        var valueAccessor = this.valueAccessor; // Value accessor: Returns absolute value, e.g. the norm in case of velocity vectors
        var minValue = d3.min(this.flatArray, function(d) { return d3.min(d.values, valueAccessor); });
        var maxValue = d3.max(this.flatArray, function(d) { return d3.max(d.values, valueAccessor); });
        this.valueExtent = [minValue, maxValue];
        
        if(this.cropPercentile > 0){
            var flatArr = [].concat.apply([], this.flatArray.map(function(d){ return d.values.map(valueAccessor) })); // Create a 2D array with only the values at each position, then flatten that array
            this.scaleExtent = [stats.percentile(flatArr, this.cropPercentile), stats.percentile(flatArr, 1-this.cropPercentile)];
        } else {
            this.scaleExtent = this.valueExtent;
        }
    };

    TemporalData.prototype.computeTimeSteps = function(selection) {
        var result = [];
        var noValues = this.flatArray[0].values.length;
        var start = DateHelpers.firstDayOfWeek(selection.week, selection.year);
        for (var i = 0; i < noValues; i++) {
            var step = moment(start).add(i * selection.interval, 'minutes');
            result.push(step);
        }
        return result;
    };

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
    };

    return TemporalData;
});
