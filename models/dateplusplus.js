// Get the week number for the created date
Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
} 

Date.prototype.FirstDayOfWeek = function(week, year) { 

    if (year==null) {
        year = (new Date()).getFullYear();
    }

    var date       = firstWeekOfYear(year),
        weekTime   = weeksToMilliseconds(week),
        targetTime = date.getTime() + weekTime;

    return date.setTime(targetTime); 

}

Date.prototype.LastDayOfWeek = function(week, year) { 

    if (year==null) {
        year = (new Date()).getFullYear();
    }

    var date       = firstWeekOfYear(year),
        weekTime   = weeksToMilliseconds(week+1)-1,
        targetTime = date.getTime() + weekTime;

    return date.setTime(targetTime); 

}

function weeksToMilliseconds(weeks) {
    return 1000 * 60 * 60 * 24 * 7 * (weeks - 1);
}

function firstWeekOfYear(year) {
    var date = new Date();
    date = firstDayOfYear(date,year);
    date = firstWeekday(date);
    return date;
}

function firstDayOfYear(date, year) {
    date.setYear(year);
    date.setDate(1);
    date.setMonth(0);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

/**
 * Sets the given date as the first day of week of the first week of year.
 */
function firstWeekday(firstOfJanuaryDate) {
    // 0 correspond au dimanche et 6 correspond au samedi.
    var FIRST_DAY_OF_WEEK = 1; // Monday, according to iso8601
    var WEEK_LENGTH = 7; // 7 days per week
    var day = firstOfJanuaryDate.getDay();
    day = (day === 0) ? 7 : day; // make the days monday-sunday equals to 1-7 instead of 0-6
    var dayOffset=-day+FIRST_DAY_OF_WEEK; // dayOffset will correct the date in order to get a Monday
    if (WEEK_LENGTH-day+1<4) {
        // the current week has not the minimum 4 days required by iso 8601 => add one week
        dayOffset += WEEK_LENGTH;
    }
    return new Date(firstOfJanuaryDate.getTime()+dayOffset*24*60*60*1000);
}

/**
 * Returns the number of weeks in the given year
 */
function NumberOfWeeks(year) {
    var dec31 = new Date(year,11, 31);
    return dec31.getWeek();
}