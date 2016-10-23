angular.module('lakeViewApp').service('DataIndex', function($q, DATA_HOST, DateHelpers) {
    this.load = function() {
        return loadIndex().then(parseLakes);
    };

    function loadIndex() {
        return $q(function(resolve, reject) {
            d3.json(DATA_HOST + 'available_data.json', function(err, data) {
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
                    reject('invalid name'); return;
                }
                var folder = lakeData.folder;
                if (typeof folder !== 'string') {
                    reject('invalid folder'); return;
                }
                var interval = lakeData.interval;
                if (isNaN(interval)) {
                    reject('invalid interval'); return;
                }
                var data = parseData(lakeData.data);
                if (!data) {
                    reject('invalid data'); return;
                }
                var years = data.keys().sort();
                return {
                    name: name,
                    folder: folder,
                    interval: interval,
                    data: data,
                    years: years
                };
            });
            resolve(parsedData);
        });
    }

    function parseData(data) {
        if (!data) {
            return;
        }
        var result = d3.map();
        for (var yearString in data) {
            // yearString is a 4 digit year number prefixed with Y, e.g. Y2000
            var year = +yearString.substring(1);
            result.set(year, data[yearString]);
        }

        return result;
    }
});
