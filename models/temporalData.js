var TemporalData = function(valuesFile, numberOfValues, numberOfTimesteps, callback) {
	var me = this;
	this.numberOfValues = numberOfValues;
	this.gridWidth = 182;
	this.gridHeight = 36;
	this.nT = numberOfTimesteps;

	// Empty array used when the data is not available
	this.PrepareFallbackArray();
	
	// Read the initial data
	this.readArray(valuesFile, function(arr) { 
		me.Data = arr;
		callback();
	});
}

TemporalData.prototype.PrepareFallbackArray = function() {
	var fallback = [];
	var vals = [];
	for(var t = 0 ; t < this.nT ; ++t) {
		var data = [];
		for(var i = 0 ; i < this.numberOfValues ; ++i) {
			data.push(0);
		}
		if(this.numberOfValues == 1)
			vals.push(data[0]);
		else
			vals.push(data);
	}

    for(var i = 0 ; i < this.gridWidth*this.gridHeight ; ++i) {
    	var v =
    		{
    			x:0,
    			y:0,
    			value:vals
    		};
    	fallback.push(v);
    }

    this.fallBackArray = fallback;
}

TemporalData.prototype.PrepareNextFiles = function(valuesFile) {
	var me = this;
	this.readArray(valuesFile, function(arr) { 
		me.NextData = arr;
	});

	return this;
}

TemporalData.prototype.X = function(arr, index) {
	var idx = this.gridHeight*(2+this.numberOfValues*this.nT)*parseInt(index/this.gridHeight) + (index % this.gridHeight);
	return arr[idx];
}

TemporalData.prototype.Y = function(arr, index) {
	var idx = this.gridHeight*(2+this.numberOfValues*this.nT)*parseInt(index/this.gridHeight) + (index % this.gridHeight) + this.gridHeight;
	return arr[idx];
}

TemporalData.prototype.V = function(arr, index) {
	var from = this.gridHeight*(2+this.numberOfValues*this.nT)*parseInt(index/this.gridHeight) + (index % this.gridHeight) + 2*this.gridHeight;

	var vals = [];
	for(var t = 0 ; t < this.nT ; ++t) {
		var data = [];
		for(var i = 0 ; i < this.numberOfValues ; ++i) {
			var idx = from + i*this.nT*this.gridHeight + t*this.gridHeight;
			data.push(arr[idx]);
		}
		if(this.numberOfValues == 1)
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

TemporalData.prototype.readArray = function(file, callback) {
	var me = this;
	d3.text(file, function(err, data) {
		if(err) {
			console.log("File not found (" + file + ") falling back to default array");
			callback(me.fallBackArray);
			return;
		}
        // split data at line breaks and commas and parse the numbers
        var arr =  data.split(/[,\n]/).map(function(d) { return parseFloat(d); });
        var res = [];
        for(var i = 0 ; i < me.gridWidth*me.gridHeight ; ++i) {
        	var v =
        		{
        			x:me.X(arr, i),
        			y:me.Y(arr, i),
        			value:me.V(arr, i)
        		};
        	res.push(v);
        }

        me.recomputeBounds(res);

		callback(res);
	})

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
