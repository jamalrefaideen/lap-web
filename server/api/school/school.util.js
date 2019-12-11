var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var AcademicYear = require('../academicyear/academicyear.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var KlassHoliday = require('../klassholiday/klassholiday.model');
var KlassHolidayService = require('../klassholiday/klassholiday.service');
var Klass = require('../klass/klass.model');
var DateUtil = require('../common/date-util');


exports.getNoOfWorkingDays = getNoOfWorkindDays;
exports.getAllKlassHolidaysByDate = getAllKlassHolidaysByDate;
exports.getAllKlassWorkingSchoolCalenders = getAllKlassWorkingSchoolCalenders;


function getNoOfWorkindDays(klassId, academicYearInfo, currentDate, callback) {
    getAllKlassWorkingSchoolCalenders(klassId, academicYearInfo, currentDate)
        .then(function (totalWorkingCaleners) {
            callback(null, totalWorkingCaleners.length);
        })
        .catch(callback)

}
function getAllKlassHolidaysByDate(klassId, academicYearId, currentDate) {
    var query = {klassId: klassId, academicYearId: academicYearId};
    return findSchoolCalender(currentDate)
        .then(function (currentDateSchoolCalender) {
            return getKlassHolidays(currentDateSchoolCalender, klassId, academicYearId)
        })
}

function getKlassHolidays(currentDateSchoolCalender, klassId, academicYearId) {
    var query = {klassId: klassId, academicYearId: academicYearId};
    return KlassHoliday.find(query)
        .lean()
        .populate("schoolCalendarId")
        .then(function (klassHoildays) {
            var todayHolidaysTillToday = klassHoildays.filter(function (klassHoliday) {
                var schoolHolidayCalender = klassHoliday.schoolCalendarId;
                if (currentDateSchoolCalender.date >= schoolHolidayCalender.date) return true;
                return false;
            })
            return todayHolidaysTillToday;
        });
}


function getAllKlassWorkingSchoolCalenders(klassId, academicYearInfo, currentDate) {
    var getAcademicSchoolCalendersByDate = _.partial(getSchoolCalenderWithHolidayInfo, academicYearInfo, currentDate);
    return getAllKlassHolidaysByDate(klassId, academicYearInfo._id, currentDate)//get all  default holidays and custom holidays till currentDate(saturday and sumdays)
        .then(getAcademicSchoolCalendersByDate)// get all academic  calendes till currentDate
        .then(filterSchoolWorkingDaysCalenders)

}

function filterSchoolWorkingDaysCalenders(schoolCalenderInfo) {
    var result = _.filter(schoolCalenderInfo.academicSchoolCalendarsTillDate, function (acadamicSchoolCalendar) {
        var schoolCalendar = _.find(schoolCalenderInfo.klassHolidayCalenderList, function (holidayCalender) {
            return holidayCalender._id.toString() == acadamicSchoolCalendar._id.toString();
        });
        return !schoolCalendar ? true : false;
    })

    return result;
}

function getSchoolCalenderWithHolidayInfo(academicYearInfo, currentDate, klassHoildays) {
    return new Promise(function (resolve, reject) {
        SchoolCalendar.findBetweenDates(academicYearInfo.fromDate.date, currentDate, function (err, academicSchoolCalendarsTillDate) {
            if (err) return reject(err);
            var klassHolidayCalenderList = _.map(klassHoildays, "schoolCalendarId");
            resolve({
                klassHolidayCalenderList: klassHolidayCalenderList,
                academicSchoolCalendarsTillDate: academicSchoolCalendarsTillDate
            })
        })
    })
}


function findSchoolCalender(date) {
    return new Promise(function (resolve, reject) {
        SchoolCalendar.findByDate(date, function (err, result) {
            if (err)return reject(err);
            resolve(result);
        });
    });
}
function fetchCustomHolidayCalenders(klassId, academicYearInfo, schoolCalenderInfo) {
    return KlassHolidayService.getKlassCustomHolidays(klassId, academicYearInfo._id)
        .then(function (customHolidays) {
            schoolCalenderInfo.customHolidayCalenders = _.map(customHolidays, "schoolCalendarId");
            return schoolCalenderInfo;
        });
}


