angular.module('meteolakesApp').factory('TemporalData', function(DATA_HOST, NETCDF_DATA_HOST, $q, DateHelpers, stats, Util) {
    var TemporalData = function(fieldName, cropPercentile, suffix) {
        this.fieldName = fieldName;
        this.suffix = suffix || '';
        this.timeSteps = [];
        this.Data = [];
        this.ready = false;
        this.available = false;
        this.valueAccessor = function(d) { return d; };
        this.cropPercentile = cropPercentile || 0; // Percentile of data to limit color scale to
        this.config = null;
        this.timeSelection = null;
    };

    TemporalData.prototype.setValueAccessor = function(valueAccessor) {
        this.valueAccessor = valueAccessor;
    };

    TemporalData.prototype.map = function(fn) {
        return this.Data.map(function(d, i) {
            return d.map(function(d0, j) {
                return d0 ? fn(d0, i, j) : null;
            });
        });
    };

    TemporalData.prototype.setTimeSelection = function(selection) {
        var me = this;
        me.timeSelection = selection;
        var file = me.getValuesFile(true);
        me.ready = false;

        return $q(function(resolve) {
            // Read the data config
            d3.json(file + '.json', function(err, config) {
                if (err) {
                    me.config = null;
                    me.available = false;
                } else {
                    me.parseConfig(config);
                    me.available = true;
                }
                resolve();
            });
        });
    };

    TemporalData.prototype.readData = function() {
        var me = this;
        me.ready = false;
  
        return $q(function(resolve, reject) {
            if (!me.available) {
                reject('No data available');
            } else {
                var file = me.getValuesFile();
                d3.text(file, function(err, data) {
                    if (err) {
                        reject('File not found: ' + file);
                    } else {
                        me.parseCSV(data);
                        me.resetBounds();
                        me.timeSteps = me.computeTimeSteps();
                        me.ready = true;
                        resolve();
                    }
                });
            }
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

        this.config = config;
    };

    TemporalData.prototype.parseCSV = function(data) {
        var me = this;
        var z;

        this.flatArray = [];
        this.Data = d3.csv.parseRows(data, function(row) {
            var parsedRow = [];
            for (var i = 0; i < me.config.GridHeight; i++) {
                var x = +row[i];
                var y = +row[me.config.GridHeight + i];
                if (me.config.NumberOfCoordinates > 2) {
                    z = +row[2 * me.config.GridHeight + i];
                } else {
                    z = -0.5;
                }
                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    // No data for this cell
                    parsedRow.push(null);
                } else {
                    var values = [];
                    var hasNaN = false;
                    // Get values for all time steps
                    for (var j = 0; j < me.config.Timesteps; j++) {
                        var value = [];
                        for (var k = 0; k < me.config.NumberOfValues; k++) {
                            var v = +row[(me.config.NumberOfCoordinates
                                + k * me.config.Timesteps + j) * me.config.GridHeight + i];
                            if (isNaN(v)) {
                                hasNaN = true;
                            }
                            value.push(v);
                        }
                        if (me.config.NumberOfValues === 1) {
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

        // Value accessor: Returns absolute value, e.g. the norm in case of velocity vectors
        var valueAccessor = this.valueAccessor;
        var minValue = d3.min(this.flatArray,
            function(d) { return d3.min(d.values, valueAccessor); });
        var maxValue = d3.max(this.flatArray,
            function(d) { return d3.max(d.values, valueAccessor); });
        this.valueExtent = [minValue, maxValue];

        if (this.cropPercentile > 0) {
            // Create a 2D array with only the values at each position, then flatten that array
            var flatArr = [].concat.apply([],
                this.flatArray.map(function(d) { return d.values.map(valueAccessor); }));
            this.scaleExtent = [stats.percentile(flatArr, this.cropPercentile),
                stats.percentile(flatArr, 1 - this.cropPercentile)];
        } else {
            this.scaleExtent = this.valueExtent;
        }
    };

    TemporalData.prototype.computeTimeSteps = function() {
        var result = [];
        var noValues = this.flatArray[0].values.length;
        var selection = this.timeSelection;
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

    TemporalData.prototype.getValuesFile = function(json) {
        var sel = this.timeSelection;
        if (sel === null) return '';
        var suffix = (this.suffix !== '') ? '_' + this.suffix : '';
        
        if (sel.needNetcdf && !json && suffix === '') {
            var lake = sel.folder === 'data' ? 'geneva' : sel.folder.slice(5);
            return NETCDF_DATA_HOST + '/week/' + sel.week + '/' + sel.year + '/' + lake + '/' + this.fieldName + '/' + sel.depth;
        }
        
        return DATA_HOST + sel.folder + '/' + sel.year + '/' + this.fieldName + '/data_week' + sel.week + suffix + '.csv';
    };

    // Minimap image showing slice location - this is lake-specific and must be stored with the data
    TemporalData.prototype.getMinimapSrc = function() {
        if (this.suffix === '' || this.timeSelection === null) {
            return '';
        }
        return DATA_HOST + this.timeSelection.folder + '/' + this.suffix + '.png';
    };

    // Lake specific options - this is lake-specific and muist be stored with the data
    TemporalData.prototype.getLakeOptions = function() {
        var jsonUrl = DATA_HOST + this.timeSelection.folder + '/options.json';
        var timeSelection = this.timeSelection;
        return $q(function(resolve, reject) {
            if (timeSelection === null) {
                reject('No options found.');
            }
            // Read the data labels
            d3.json(jsonUrl, function(err, json) {
                if (err) {
                    reject('Error retrieving lake options. Url: ' + jsonUrl + '. Error: ' + err);
                } else {
                    resolve(json);
                }
            });
        });
    };

    TemporalData.prototype.getGlobalOptions = function() {
        var jsonUrl = DATA_HOST + '/options.json';
        return $q(function(resolve, reject) {
            // Read the data labels
            d3.json(jsonUrl, function(err, json) {
                if (err) {
                    reject('Error retrieving global options. Url: ' + jsonUrl + '. Error: ' + err);
                } else {
                    resolve(json);
                }
            });
        });
    };

    TemporalData.prototype.parseDataCSV = function(data) {
        let rows = [];
        d3.csv.parseRows(data, function(row) {
            rows.push(row.slice(1))
        });
        let result = [];
        var regExp = /\(([^,)]+), ([^)]+)\)/;

        for(let i = 0; i < rows[0].length; i++) {

            let value = rows[1][i];
            var matches = regExp.exec(value);
            if(matches) {
                value = Util.norm([matches[1], matches[2]]);
            } else {
                value = +value;
            }

            let object = {
                'date': moment(rows[0][i], "DD/MM/YYY HH:mm"),
                'value': value,
            };
            if(rows.length > 3) { // Add min/max if available to plot the range
                let min_value = rows[2][i];
                matches = regExp.exec(min_value);
                if(matches) {
                    min_value = Util.norm([matches[1], matches[2]]);
                } else {
                    min_value = +min_value;
                }
                object['min_value'] = min_value;

                let max_value = rows[3][i];
                matches = regExp.exec(max_value);
                if(matches) {
                    max_value = Util.norm([matches[1], matches[2]]);
                } else {
                    max_value = +max_value;
                }
                object['max_value'] = max_value;
            }
            result.push(object);
        }
        return result;
    };

	// Get data to plot graph e.g. http://aphyspc18.epfl.ch/api/range/coordinates/534700/144950/geneva/temperature/1537034400000/1537768800000/20
	TemporalData.prototype.buildDataUrl = function(coord) {
		var sel = this.timeSelection;
        if (sel === null) return '';
        
        var lake = sel.folder === 'data' ? 'geneva' : sel.folder.slice(5);
		var url = `${NETCDF_DATA_HOST}/range/coordinates/${coord.x}/${coord.y}/${lake}/${this.fieldName}/${+DateHelpers.firstDayOfWeek(sel.week, sel.year)}/${+DateHelpers.lastDayOfWeek(sel.week, sel.year)}`;
		
		if(coord.z) {
			url = `${url}/${Math.abs(coord.z)}`;
		}
	
        return url;
    };
	
	TemporalData.prototype.getDataAtPoint = function(coord) {
		var me = this;
  
        return $q(function(resolve, reject) {
			var url = me.buildDataUrl(coord);
			d3.text(url, function(err, data) {
				if (err) {
					reject('url not found: ' + url);
				} else {
					resolve(me.parseDataCSV(data));
				}
			});
        });
	}

    return TemporalData;
});
