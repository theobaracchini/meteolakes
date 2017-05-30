angular.module('meteolakesApp').service('DataIndex', function($q, DATA_HOST, DateHelpers) {
    this.load = function(file) {
        return loadIndex(file).then(parseLakes);
    };

    function loadIndex(file) {
        return $q(function(resolve, reject) {
            d3.json(DATA_HOST + file + '.json', function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    function parseLakes(data) {
        return $q(function(resolve, reject) {
            var parsedData = data.map(function(lakeData) {
                var name = lakeData.name;
                if (typeof name !== 'string') {
                    reject('invalid name'); return null;
                }
                var folder = lakeData.folder;
                if (typeof folder !== 'string') {
                    reject('invalid folder'); return null;
                }
                var interval = lakeData.interval;
                if (isNaN(interval)) {
                    reject('invalid interval'); return null;
                }
                var pdata = parseData(lakeData.data);
                if (!pdata) {
                    reject('invalid data'); return null;
                }
                var years = pdata.keys().sort();
                return {
                    name: name,
                    folder: folder,
                    interval: interval,
                    data: pdata,
                    years: years
                };
            });
            resolve(parsedData);
        });
    }

    function parseData(data) {
        if (!data) {
            return null;
        }
        var result = d3.map();
        Object.keys(data).forEach(function(yearString) {
            // yearString is a 4 digit year number prefixed with Y, e.g. Y2000
            var year = +yearString.substring(1);
            result.set(year, data[yearString]);
        });

        return result;
    }
});
