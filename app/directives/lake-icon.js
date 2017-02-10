angular.module('meteolakesApp').directive('lakeIcon', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            src: '@', // Image URI
            lat: '@', // Position of icon on map
            lng: '@',
            width: '@', // Icon dimensions
            height: '@',
            anchorLeft: '@', // Point of icon which corresponds to the specified position (lat/lng)
            anchorTop: '@',
            popupLeft: '@', // Point from which the popup should open, relative to anchor point
            popupTop: '@'
        },
        require: '^^lakeView',
        template: '<div ng-transclude></div>',
        link: function(scope, element, attrs, viewCtrl) {
            // The contents between <lake-icon> and </lake-icon>
            var innerHTML = element[0].children[0].innerHTML;
            // We don't want the contents to be visible other than in the leaflet map popup
            element[0].children[0].remove();

            var icon = {
                src: scope.src,
                lat: parseFloat(scope.lat),
                lng: parseFloat(scope.lng),
                width: parseInt(scope.width, 10),
                height: parseInt(scope.height, 10),
                anchorLeft: parseInt(scope.anchorLeft, 10),
                anchorTop: parseInt(scope.anchorTop, 10),
                popupLeft: parseInt(scope.popupLeft, 10),
                popupTop: parseInt(scope.popupTop, 10),
                popupText: innerHTML
            };
            viewCtrl.addIcon(icon);
        }
    };
});
