angular.module('lakeViewApp').service('DateHelpers', function() {
    function firstDayOfWeek(week, year) {
        return moment().year(year).isoWeek(week).startOf('isoWeek');
    }

    function lastDayOfWeek(week, year) {
        return moment().year(year).isoWeek(week).endOf('isoWeek');
    }

    /**
     * Returns the number of weeks in the given year
     */
    function numberOfWeeks(year) {
        return moment().year(year).isoWeeksInYear();
    }

    function yearMonthDay(date) {
        return date.format('YYYY-MM-DD');
    }

    function hoursMinutes(date) {
        return date.format('HH:mm');
    }

    return {
        firstDayOfWeek: firstDayOfWeek,
        lastDayOfWeek: lastDayOfWeek,
        numberOfWeeks: numberOfWeeks,
        yearMonthDay: yearMonthDay,
        hoursMinutes: hoursMinutes
    };
});
