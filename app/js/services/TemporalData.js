var app = angular.module('lakeViewApp');

app.factory('TemporalData', function(DATA_HOST) {
    var TemporalData = function(dataFolder, fieldName) {
        this.dataFolder = dataFolder;
        this.fieldName = fieldName;
        this.Data = undefined;
        this.DataTime = [];
        this.DataTime.Year = undefined;
        this.DataTime.Week = undefined;
    }

    TemporalData.prototype.map = function(fn) {
        return this.xy.map(function(d) {
            return d.map(function(d0) {
                return d0 ? fn(d0) : null;
            });
        });
    }

    TemporalData.prototype.SwitchToData = function(week, year) {
        this.DataTime.Year = year;
        this.DataTime.Week = week;
        // this.Data = this.buffered[year + '_' + week];

        return this;
    }

    TemporalData.prototype.readData = function(week, year, callback) {
        var me = this;

        var valuesFile = DATA_HOST + me.dataFolder + '/' + year + '/' + me.fieldName + '/data_week' + week + '.csv'; 

        // Read the data config
        d3.json(valuesFile + '.json', function(err, config) {
            if(err) {
                console.log('File not found (' + valuesFile + ') falling back to default array');
                callback([]);
                return;    
            }
        
            me.readArray(valuesFile, config, function(arr) {
                callback(arr);
            });
        });

        return this;
    }

    TemporalData.prototype.readArray = function(file, config, callback) {
        var me = this;

        d3.text(file, function(err, data) {
            if(err) {
                console.log('File not found (' + file + ') falling back to default array');
                callback([]);
                return;
            }

            me.xy = d3.csv.parseRows(data, function(row) {
                var result = [];
                for (var i = 0; i < config.GridHeight; i++) {
                    var x = +row[i];
                    var y = +row[config.GridHeight + i];
                    if (isNaN(x) || isNaN(y)) {
                        // No data for this cell
                        result.push(null);
                    } else {
                        var values = [];
                        // Get values for all time steps
                        for (var j = 0; j < config.Timesteps; j++) {
                            var value = [];
                            for (var k = 0; k < config.NumberOfValues; k++) {
                                value.push(+row[(2 + k * config.Timesteps + j) * config.GridHeight + i]);
                            }
                            if (config.NumberOfValues == 1) {
                                value = value[0];
                            }
                            values.push(value);
                        }
                        result.push({
                            x: x,
                            y: y,
                            values: values
                        });
                    }
                }
                return result;
            });

            // TODO remove
            me.Data = me.xy.reduce(function(a, b) {
                return a.concat(b);
            }, []).filter(function (d) {
                return d;
            });

            me.recomputeBounds(me.Data);

            callback(me.Data);
        });

        return this;
    }

    TemporalData.prototype.recomputeBounds = function(res) {
        this.xMin = d3.min(res.map(function(t) { return t.x }));
        this.xMax = d3.max(res.map(function(t) { return t.x }));

        this.yMin = d3.min(res.map(function(t) { return t.y }));
        this.yMax = d3.max(res.map(function(t) { return t.y }));

        return this;
    }

    return TemporalData;
});
