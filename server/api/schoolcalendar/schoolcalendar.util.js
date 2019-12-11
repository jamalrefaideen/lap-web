const moment = require('moment');
const _ = require('lodash');

exports.getMomentDateFormat = function () {
    return "MM/DD/YYYY";
};


exports.getMomentDateFormatForAgendaEvents = function () {
    return "YYYY-MM-DD"
};


exports.formatDateByMoment = function (calenderDate,momentDateFormat) {
    return moment.utc(calenderDate).format(momentDateFormat)
};


exports.findDayIndexOfYear = function (inputDate) {
    //https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
    var inputDateObj = new Date(inputDate);
    var monthIndex = inputDateObj.getMonth();
    var year = inputDateObj.getUTCFullYear();
    var year_start = Date.UTC(year, 0, 1);
    var diff = inputDateObj - year_start;
    var day_length_in_ms = 1000 * 60 * 60 * 24;
    var dayIndex = Math.floor(diff / day_length_in_ms);
    return dayIndex;
};


exports.getDaysArrayByMonth = function (monthAndYear) {
    var monthIndex = monthAndYear.monthIndex;
    var daysInMonth = moment().month(monthIndex).daysInMonth();
    var daysRangeList = _.range(1,daysInMonth+1);
    var daysStrList = _.map(daysRangeList, function (dayIndex) {
        var monthDate =  new Date(monthAndYear.year,monthIndex,dayIndex);
        var dateStr = moment(monthDate).format("YYYY-MM-DD");
        return dateStr;
    });
    return daysStrList;
};
