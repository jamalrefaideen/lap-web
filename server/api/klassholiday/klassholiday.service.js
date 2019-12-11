/**
 * Created by Mathdisk on 8/18/2017.
 */

var async = require("async");
var _ = require("lodash");
var moment = require("moment");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;

var KlassHoliday = require('./klassholiday.model');
var School = require('../school/school.model');
var Klass = require('../klass/klass.model');
var SchoolHoliday = require('../schoolholiday/schoolholiday.model');
var AcademicYear = require('../academicyear/academicyear.model');
var DateUtil = require('../common/date-util');


exports.getKlassCustomHolidays = getKlassCustomHolidays;
exports.createDefaultHolidaysToSchool = createDefaultHolidaysToSchool;
exports.createDefaultHolidaysToKlasses = createDefaultHolidaysToKlasses;
exports.createCustomHolidaysToKlasses = createCustomHolidaysToKlasses;
exports.getKlassHolidaysBySchoolCalender = getKlassHolidaysBySchoolCalender;


/**
 * 1. remove all klasses default  holidays  in the academic year, if exists
 * 2. create default holidays(Saturday and Sunday)  to all classes in school
 * @param academicYearInfo
 * @param schoolId
 */
function createDefaultHolidaysToSchool(academicYearInfo, schoolId) {
    var createSchoolDefaultHolidays = _.partial(createDefaultHolidays, academicYearInfo, schoolId);
    removeDefaultHolidays(schoolId, academicYearInfo._id)
        .then(createSchoolDefaultHolidays)
}

/**
 * find klass list by school id, then create default holidays to all klasses
 * @param academicYearInfo
 * @param schoolId
 * @returns {*}
 */
function createDefaultHolidays(academicYearInfo, schoolId) {
    var createDefaultHolidaysToSchoolKlasses = _.partial(createDefaultHolidaysToKlasses, academicYearInfo);
    return Klass.find({"schoolId": schoolId}).lean()
        .then(createDefaultHolidaysToSchoolKlasses)
}

/**
 * find academic default holiday list, return list of school calenders(saturday and sunday)
 * create default holidays to all klasses   for academic year
 * @param academicYearInfo
 * @param klassList
 * @returns {*}
 */
function createDefaultHolidaysToKlasses(academicYearInfo, klassList) {
    return getDefaultHolidayCalenderList(academicYearInfo)
        .then(function (holidaySchoolCalenderList) {
            var getKlassDefaultHolidaysFunc = _.partial(getKlassDefaultHolidays, academicYearInfo, holidaySchoolCalenderList);
            var klassHolidayListInfo = {list: []};
            _.reduce(klassList, getKlassDefaultHolidaysFunc, klassHolidayListInfo);
            return KlassHoliday.create(klassHolidayListInfo.list);
        });
}

/**
 * add list of klass default holiday model obj   to result
 * result -  list of all klass holiday list
 * @param academicYearInfo
 * @param holidaySchoolCalenderList
 * @param klass
 * @param result
 * @returns {*|{custom_concat}|{}|{test, test3}|string|Array.<T>}
 */
function getKlassDefaultHolidays(academicYearInfo, holidaySchoolCalenderList, klassHolidayListInfo, klass) {
    var klassHolidays = _.map(holidaySchoolCalenderList, function (schoolCalender) {
        var holidayName = moment(schoolCalender.date).format("dddd, MMMM Do YYYY");
        return {
            klassId: klass._id,
            schoolId: klass.schoolId,
            schoolCalendarId: schoolCalender._id,
            academicYearId: academicYearInfo._id,
            holidayName: holidayName,
            holidayDescription: holidayName,
            isDefault: true
        }
    });
    klassHolidayListInfo.list = klassHolidayListInfo.list.concat(klassHolidays);
    return klassHolidayListInfo;
}

/**
 * remove default holidays  by school and academic year
 * @param schoolId
 * @param academicYearId
 * @returns {*}
 */
function removeDefaultHolidays(schoolId, academicYearId) {
    var query = {
        "academicYearId": academicYearId,
        'schoolId': schoolId,
        "isDefault": true
    };
    return KlassHoliday.remove(query);
}


/**
 * return academic default holiday  school calender list
 * @param academicYearInfo
 */
function getDefaultHolidayCalenderList(academicYearInfo) {
    var holidayDateList = getListOfAcademicDefaultHolidays(academicYearInfo);
    return convertHolidaysToSchoolCalenders(holidayDateList);
}

/**
 * return  list of  holidays(date obj) in the academic year
 * @param academicYearInfo
 * @returns {*|{custom_concat}|{}|{test, test3}|string|Array.<T>}
 */
function getListOfAcademicDefaultHolidays(academicYearInfo) {
    var fromDate = academicYearInfo.fromDate.date;
    var toDate = academicYearInfo.toDate.date;
    var sundays = DateUtil.getDaysBetweenDates(fromDate, toDate, "Sunday");
    var saturdays = DateUtil.getDaysBetweenDates(fromDate, toDate, "Saturday");
    return saturdays.concat(sundays);
}


/**
 * convert  holiday dates to school calenders list
 * @param dates
 */
function convertHolidaysToSchoolCalenders(dates) {
    return new Promise(function (resolve, reject) {
        var SchoolCalenderModel = mongoose.model('SchoolCalendar');
        SchoolCalenderModel.findByDateList(dates, function (err, dateSchoolCalenderMap) {
            if (err) return reject(err);
            resolve(_.values(dateSchoolCalenderMap))
        });
    });
}

function getKlassCustomHolidays(klassId, academicYearId) {
    var query = {
        klassId: klassId,
        academicYearId: academicYearId,
        isDefault: false
    }
    return KlassHoliday.find(query)
        .lean()
        .populate('schoolCalendarId');
}


function createCustomHolidaysToKlasses(academicYearInfo, klassList) {
    if (klassList.length == 0) return Promise.resolve([]);
    var schoolId = klassList[0].schoolId;
    return getSchoolCustomHolidays(schoolId, academicYearInfo._id)
        .then(function (customHolidays) {
            var allKlassCustomHolidays = [];
            _.each(klassList, function (klass) {
                allKlassCustomHolidays = allKlassCustomHolidays.concat(buildCustomHolidaysToKlass(customHolidays, klass));
            });
            return createKlassHolidays(allKlassCustomHolidays)
        });
}

function buildCustomHolidaysToKlass(customHolidays, klass) {
    var klassHolidays = [];
    _.each(customHolidays, function (holiday) {
        var klassHoliday = {
            klassId: klass._id,
            schoolCalendarId: holiday.schoolCalendarId,
            holidayName: holiday.holidayName,
            holidayDescription: holiday.holidayDescription,
            isDefault: false,
            academicYearId: holiday.academicYearId,
            schoolId: holiday.schoolId
        }
        klassHolidays.push(klassHoliday);
    })
    return klassHolidays;
}


function getSchoolCustomHolidays(schoolId, academicYearId) {
    var query = {
        schoolId: schoolId,
        academicYearId: academicYearId
    }
    return SchoolHoliday.find(query)
        .lean()
        .populate('schoolCalendarId');
}

function createKlassHolidays(holidayList) {
    return new Promise(function (resolve, reject) {
        KlassHoliday.create(holidayList, function (err, createdHolidays) {
            if (err) return reject(err);
            resolve(createdHolidays);
        });
    })

}


function getKlassHolidaysBySchoolCalender(klassId, schoolCalendarId) {
    return KlassHoliday
        .find({klassId: klassId, schoolCalendarId: schoolCalendarId})
        .lean();

}