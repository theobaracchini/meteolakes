var TemporalData = function(valuesFile, callback) {
	var me = this;

	// Read the initial data config
	d3.json(valuesFile + ".json", function(err, config) {
		if(err) {
			console.log("File not found (" + valuesFile + ") falling back to default array");
			callback();
			return;	
		}

		// Read the initial data
		me.readArray(valuesFile, config, function(arr) { 
			me.Data = arr;
			callback();
		});
	});
}

TemporalData.prototype.PrepareNextFiles = function(valuesFile) {
	var me = this;

	// Read the next data config
	d3.json(valuesFile + ".json", function(err, config) {
		if(err) {
			console.log("File not found (" + valuesFile + ") falling back to default array");
			return;	
		}

		me.readArray(valuesFile, config, function(arr) { 
			me.NextData = arr;
		});
	});

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

TemporalData.prototype.SwitchToNextData = function() {
	if(this.HasNextData()) {
		// free memory
		this.Data = null;
		this.Data = this.NextData;
		this.NextData = null;
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

TemporalData.prototype.HasNextData = function() { return this.NextData != null; }
