'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;

var KlassHoliday = require('./klassholiday.model');
var Klass = require('../klass/klass.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var auditManager = require('../../config/auditmanager');
var SchoolHolidayService = require("../schoolholiday/schoolholiday.service");
var EventService = require("../event/event.service");


//inputDate:{holidayDate, holidayDescription, klassIdList}
exports.createKlassHoliday = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearInfo = loggedUserData.academicYearData;
    var holidayInfo = req.body;
    var klassIdList = _.map(holidayInfo.klassIdList, function (klassId) {
        return mongoose.Types.ObjectId(klassId);
    });
    var holidayDate = new Date();
    holidayDate.setDate(holidayInfo.date);
    holidayDate.setMonth(holidayInfo.month);
    holidayDate.setUTCFullYear(holidayInfo.year);

    var holidaySchoolCalendar = null;
    async.waterfall([

        function (next) {
            SchoolCalendar.findByDate(holidayDate, next);
        },

        //create school holiday
        function (schoolCalenderData, next) {
            if (schoolCalenderData == null) return next("Could not find school calender in holiday date")
            holidaySchoolCalendar = schoolCalenderData;
            var schoolHolidatData = {
                holidayName: holidayInfo.holidayName,
                holidayDescription: holidayInfo.holidayDescription,
                schoolCalendarId: schoolCalenderData._id
            };
            auditManager.populateCreationAcademicAccountAudit(loggedUserData, schoolHolidatData);
            SchoolHolidayService.createSchoolHoliday(schoolHolidatData)
                .then(function () {
                    next(null, schoolCalenderData)
                })
                .catch(next);
        },

        function (schoolCalenderData, next) {
            var query = {
                'schoolId': loggedUserData.schoolId,
                'schoolCalendarId': schoolCalenderData._id,
                'academicYearId': academicYearInfo._id,
                'klassId': {$in: klassIdList}
            };
            KlassHoliday.remove(query, function (err) {
                next(err, schoolCalenderData);
            });
        },

        function (schoolCalenderData, next) {
            var klassHolidayDataList = _.map(klassIdList, function (klassId) {
                var klassHolidayData = {
                    'schoolCalendarId': schoolCalenderData._id,
                    'klassId': klassId,
                    'holidayName': holidayInfo.holidayName,
                    'holidayDescription': holidayInfo.holidayDescription,
                    "isDefault": false
                };
                auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassHolidayData);
                return klassHolidayData;
            });
            KlassHoliday.create(klassHolidayDataList, next);
        },

        //create events
        function (klassHolidays, next) {
            holidayInfo.schoolCalendarId = klassHolidays[0].schoolCalendarId;
            holidayInfo.holidayDate = holidayDate;
            EventService.createHolidayEvent(holidayInfo, loggedUserData)
                .then(function () {
                    next();
                })
                .catch(next)
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err);
        }

        return res.send(200, 'Success');
    });
};

/**
 * returns all   klass  holidays created by school ,
 * excludes default holidays
 * @param req
 * @param res
 */
exports.getAllKlassHolidaysBySchool = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var allSchoolKlasses = [];
    async.waterfall(
        [

            //find all school classes
            function (next) {
                Klass.find({'schoolId': schoolId})
                    .lean()
                    .then(function (data) {
                        allSchoolKlasses = data
                        next();
                    })
                    .catch(next)
            },

            function (next) {
                var successHandler = next.bind(null, null);
                var query = {
                    'schoolId': schoolId,
                    "isDefault": false
                };
                KlassHoliday.find(query)
                    .lean()
                    .populate('schoolCalendarId')
                    .then(successHandler)
                    .catch(next)
            },

            function (allKlassHolidays, next) {
                var holidayNameKlassListMap = _.groupBy(allKlassHolidays, "holidayName");
                var klassIdKlassMap = _.groupBy(allSchoolKlasses, "_id");
                var holidayResultFunction = createHolidayResult.bind(null, allSchoolKlasses, klassIdKlassMap);
                var result = _.map(holidayNameKlassListMap, holidayResultFunction);
                next(null, result);
            }

        ],
        function done(err, result) {
            if (err) {
                return handleError(res, err);
            }
            return res.send(200, result);
        }
    );
};


exports.getSchoolHolidayByName = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var holidayName = req.params.holidayName;
    SchoolHolidayService.getSchoolHolidayByName(schoolId, holidayName)
        .then(function (schoolHoliday) {
            res.status(200).send(schoolHoliday);
        })
        .catch(function (err) {
            res.status(500).send(err);
        })
}


function createHolidayResult(allSchoolKlasses, klassIdKlassMap, klassHolidayList, holidayName) {
    var klassHolidayObj = klassHolidayList[0];
    var data = _.merge({}, klassHolidayObj);
    data.klassHolidayList = klassHolidayList;
    data.holidayDate = klassHolidayObj.schoolCalendarId.date;
    if (klassHolidayList.length == allSchoolKlasses.length) {
        data.classesDisplayValue = "All Classes";
    } else {
        var klassNameList = [];
        _.each(klassHolidayList, function (klassHoliday) {
            var KlassObj = klassIdKlassMap[klassHoliday.klassId.toString()][0];
            klassNameList.push(KlassObj.klassName);
        });
        data.classesDisplayValue = klassNameList.join(",");
    }
    return data;
}


function handleError(res, err) {
    return res.status(500).send(err);
}
