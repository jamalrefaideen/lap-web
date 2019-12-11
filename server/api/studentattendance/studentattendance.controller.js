'use strict';
var async = require('async');
var _ = require('lodash');
var auditManager = require('../../config/auditmanager');
var StudentAttendance = require('./studentattendance.model');
var AcademicYear = require('../academicyear/academicyear.model');
var LateArrival = require('../latearrival/latearrival.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

exports.getAttendanceDetailsByStudent = function (req, res) {

    var studentId = req.params.studentId;
    var schoolId = req.loggedUserData.schoolId;
    var resultObj = {absentCount: 0, lateCount: 0, absentDates: [], lateDates: [], presentDates: [], holidayDates: []};

    async.series([
        function (next) {
            StudentAttendance.find({studentId: studentId})
                .lean()
                .populate('schoolCalendarId')
                .exec(function (err, attendanceList) {

                    if (err) {
                        return next(err);
                    }
                    resultObj.absentCount = attendanceList.length;
                    resultObj.absentDates = _.map(attendanceList, function (attendanceObj) {
                        return attendanceObj.schoolCalendarId.date;
                    });
                    next()
                });

        },
        function (next) {
            LateArrival.find({studentId: studentId})
                .lean()
                .populate('schoolCalendarId')
                .exec(function (err, lateArrivalList) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.lateCount = lateArrivalList.length;
                    resultObj.lateDates = _.map(lateArrivalList, function (lateArrivalObj) {
                        return lateArrivalObj.schoolCalendarId.date;
                    });

                    next()

                });

        },
        function (next) {
            //TODO need to find total woking days
            AcademicYear.findOne({schoolId: schoolId, isCurrent: true})
                .lean(['fromDate', 'toDate'])
                .then(function (academicYearObj) {

                    var currentDate = new Date();
                    var totalDays = academicYearObj.fromDate.date;

                    next()

                }).catch(function (err) {

                return next(err);
            });

        }], function done(err, data) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(resultObj);

    })


};

//inputDate: {
// schoolCalendarDate,
// absentStudents:[{'studentId', 'klassSectionId'}, {}, ...],
// lateArrivalStudents:[{'studentId', 'klassSectionId'}, {}, ...]
// }
exports.saveStudentAttendance = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;

    async.waterfall([

        function (next) {

            var currentDate = new Date(inputData.schoolCalendarDate);
            SchoolCalendar.findByDate(currentDate, next);
        },

        function (calendarObj, next) {

            var query = {
                schoolCalendarId: calendarObj._id,
                klassSectionId: inputData.klassSectionId
            };
            StudentAttendance.remove(query, function (err) {
                next(err, calendarObj);
            });
        },

        function (calendarObj, next) {

            var absentStudents = _.map(inputData.absentStudents, function (absentStudentData) {
                absentStudentData.schoolCalendarId = calendarObj._id;
                auditManager.populateCreationAcademicAccountAudit(loggedUserData, absentStudentData);
                return absentStudentData;
            });
            if (absentStudents.length == 0) return next(null, calendarObj, []);

            StudentAttendance.create(absentStudents, function (err, saveStudentAttendanceList) {
                next(err, calendarObj, saveStudentAttendanceList);
            });
        },

        function (calendarObj, saveStudentAttendanceList, next) {

            var query = {
                schoolCalendarId: calendarObj._id,
                klassSectionId: inputData.klassSectionId
            };
            LateArrival.remove(query, function (err) {
                next(err, calendarObj, saveStudentAttendanceList);
            });
        },

        function (calendarObj, saveStudentAttendanceList, next) {

            var lateArrivalStudents = _.map(inputData.lateArrivalStudents, function (lateArrivalStudentData) {
                lateArrivalStudentData.schoolCalendarId = calendarObj._id;
                auditManager.populateCreationAcademicAccountAudit(loggedUserData, lateArrivalStudentData);
                return lateArrivalStudentData;
            });
            if (lateArrivalStudents.length == 0) return next(null, saveStudentAttendanceList, []);

            LateArrival.create(lateArrivalStudents, function (err, saveStudentLateArrivalList) {
                next(err, saveStudentAttendanceList, saveStudentLateArrivalList);
            });

        }], function done(err, saveStudentAttendanceList, saveStudentLateArrivalList) {

        if (err) {
            return handleError(res, err)
        }

        var resultData = {
            'absentStudents': saveStudentAttendanceList,
            'lateArrivalStudents': saveStudentLateArrivalList
        };
        return res.status(200).send(resultData);
    });
};


function handleError(res, err) {
    return res.status(500).send(err);
}