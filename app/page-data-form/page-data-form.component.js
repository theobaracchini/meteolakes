'use strict';

angular.module('meteolakesApp').component('pageDataForm', {
    templateUrl: 'app/page-data-form/page-data-form.template.html',
    controller: function($scope, NETCDF_DATA_HOST) {
        this.hostname = NETCDF_DATA_HOST;

        $scope.onSetTime = function(newDate, oldDate) {
            var year = newDate.getFullYear();
            var month = newDate.getMonth();
            var day = newDate.getDate();
            var hour = newDate.getHours();
            $scope.result = new Date(Date.UTC(year, month, day, hour))
        };
    }
});
