'use strict';

angular.module('meteolakesApp').component('pageQuality', {
    templateUrl: 'app/page-quality/page-quality.template.html',
    controller: function($scope, $routeParams) {
        $scope.lakeId = $routeParams.lakeId;
    }
});
