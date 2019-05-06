'use strict';

angular.module('meteolakesApp').component('pageRemote', {
    templateUrl: 'app/page-remote/page-remote.template.html',
    bindings: {
        scale: '<'
    },
    controller: function($window, $scope) {
        var me = this;
        var isZoomed = false;
        setScale();
        angular.element($window).bind('resize', function() {
            setScale();
            $scope.$apply();
        });

        function setScale() {
            me.scale = Math.min(0.8, $('.iframe-container')[0].clientWidth / 1900.0);
        }

        me.onClick = function() {
            isZoomed = !isZoomed;
            if (isZoomed) {
                me.scale = 0.8;
            } else {
                setScale();
            }
        };
    }
});
