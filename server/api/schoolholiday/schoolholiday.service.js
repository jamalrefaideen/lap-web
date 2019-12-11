'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var SchoolHoliday = require('./schoolholiday.model');

exports.createSchoolHoliday = function (data) {
    var query = {
        schoolId: data.schoolId,
        holidayName: data.holidayName,
        academicYearId:data.academicYearId
    };
    return SchoolHoliday.findOne(query)
        .then(function (schoolHoliday) {
            if (schoolHoliday != null) return schoolHoliday;
            return createSchoolHoliday(data);
        })
        .then(function (schoolHoliday) {
            return schoolHoliday;
        })
        .catch(function (err) {
            return err;
        });
};

exports.getSchoolHolidayByName = function (schoolId, holidayName) {
    var query = {schoolId: schoolId, holidayName: holidayName};
    return SchoolHoliday.findOne(query).lean()
};


function createSchoolHoliday(data) {
    var schoolHoliday = {
        schoolId: data.schoolId,
        holidayName: data.holidayName,
        holidayDescription: data.holidayDescription,
        schoolCalendarId: data.schoolCalendarId,
        academicYearId : data.academicYearId
    };
    return SchoolHoliday.create(schoolHoliday);
}
