'use strict';

angular.module('meteolakesApp').component('pageHydro', {
    templateUrl: 'app/page-hydro/page-hydro.template.html',
    controller: function($scope, $routeParams) {
        $scope.lakeId = $routeParams.lakeId;
    }
});
