angular.module('meteolakesApp').service('DateHelpers', function() {
    this.firstDayOfWeek = function(week, year) {
        return moment().year(year).isoWeek(week).startOf('isoWeek');
    };

    this.lastDayOfWeek = function(week, year) {
        return moment().year(year).isoWeek(week).endOf('isoWeek');
    };

    /**
     * Returns the number of weeks in the given year
     */
    this.numberOfWeeks = function(year) {
        return moment().year(year).isoWeeksInYear();
    };

    this.yearMonthDay = function(date) {
        return date.format('DD-MMM-YYYY');
    };

    this.dayMonthYear = function(date) {
        return date.format('DD-MMM-YYYY');
    };

    this.hoursMinutes = function(date) {
        return date.format('HH:mm');
    };
});
