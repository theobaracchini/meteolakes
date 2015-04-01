var TemporalData = function(dataFolder, fieldName, week, year, callback) {
	var me = this;

	me.dataFolder = dataFolder;
	me.fieldName = fieldName;
	me.buffered = [];

	// Read the initial data
	me.readData(week, year, function(arr) { 
		me.Data = arr;
		callback();
	});
}

TemporalData.prototype.PrepareData = function(week, year, callback) {
	var me = this;

	// Read the next data config
	this.readData(week, year, function(arr) { callback(); });

	return this;
}

TemporalData.prototype.X = function(arr, index, config) {
	var idx = config.GridHeight*(2+config.NumberOfValues*config.Timesteps)*parseInt(index/config.GridHeight) + (index % config.GridHeight);
	return arr[idx];
}

TemporalData.prototype.Y = function(arr, index, config) {
	var idx = config.GridHeight*(2+config.NumberOfValues*config.Timesteps)*parseInt(index/config.GridHeight) + (index % config.GridHeight) + config.GridHeight;
	return arr[idx];
}

TemporalData.prototype.V = function(arr, index, config) {
	var from = config.GridHeight*(2+config.NumberOfValues*config.Timesteps)*parseInt(index/config.GridHeight) + (index % config.GridHeight) + 2*config.GridHeight;

	var vals = [];
	for(var t = 0 ; t < config.Timesteps ; ++t) {
		var data = [];
		for(var i = 0 ; i < config.NumberOfValues ; ++i) {
			var idx = from + i*config.Timesteps*config.GridHeight + t*config.GridHeight;
			data.push(arr[idx]);
		}
		if(config.NumberOfValues == 1)
			vals.push(data[0]);
		else
			vals.push(data);
	}

	return vals;
}

TemporalData.prototype.SwitchToData = function(week, year) {
	this.Data = this.buffered[year + "_" + week];

	return this;
}

TemporalData.prototype.readData = function(week, year, callback) {
	var me = this;

	// If already buffered, do not read again
	if(me.buffered[year + "_" + week] != undefined)
		callback(me.buffered[year + "_" + week]);
	else {
		var valuesFile = DATA_HOST + me.dataFolder + "/" + year + "/" + me.fieldName + "/data_week" + week + ".csv"; 

		// Read the data config
		d3.json(valuesFile + ".json", function(err, config) {
			if(err) {
				console.log("File not found (" + valuesFile + ") falling back to default array");
				callback([]);
				return;	
			}
		
			me.readArray(valuesFile, config, function(arr) {
				me.buffered[year + "_" + week] = arr;
				callback(arr);
			});
		});
	}
	return this;
}

TemporalData.prototype.readArray = function(file, config, callback) {
	var me = this;

	d3.text(file, function(err, data) {
		if(err) {
			console.log("File not found (" + file + ") falling back to default array");
			callback([]);
			return;
		}
        // split data at line breaks and commas and parse the numbers
        var arr =  data.split(/[,\n]/).map(function(d) { return parseFloat(d); });
        var res = [];
        for(var i = 0 ; i < config.GridWidth*config.GridHeight ; ++i) {
        	var v =
        		{
        			x:me.X(arr, i, config),
        			y:me.Y(arr, i, config),
        			value:me.V(arr, i, config)
        		};
        	res.push(v);
        }

        me.recomputeBounds(res);

		callback(res);
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
