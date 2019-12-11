var moment = require("moment");

/**
 * Created by Mathdisk on 8/18/2017.
 */


function getDaysBetweenDates(start, end, dayName) {
    var days = {sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6};
    var day = days[dayName.toLowerCase().substr(0, 3)];
    var startDay = moment(getDateWithoutTime(start));
    var endDay = moment(getDateWithoutTime(end));
    var result = [];
    var current = new Date(startDay);

    // Shift to next of required days
    current.setDate(current.getDate() + (day - current.getDay() + 7) % 7);
    // While less than end date, add dates to result array
    while (current < endDay) {
        result.push(new Date(+current));
        current.setDate(current.getDate() + 7);
    }

    if (startDay.day() == day) {
        result.push(new Date(startDay))
    }

    if (endDay.day() == day) {
        result.push(new Date(endDay))
    }


    return result;
}

function getDateWithoutTime(date) {
    var month = date.getMonth() < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
    return new Date(date.getUTCFullYear() + "-" + month + "-" + date.getDate())
}


function daysBetween(fromDate, toDate) {
    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    var diffDays = Math.round(Math.abs((fromDate.getTime() - toDate.getTime()) / (oneDay)));
    return diffDays;
}


exports.getDaysBetweenDates = getDaysBetweenDates;
exports.daysBetween = daysBetween;

