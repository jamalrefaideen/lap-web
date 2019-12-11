'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

var Timetable = require('./timetable.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassPeriod = require('../klassperiod/klassperiod.model');
var KlassSectionSubject = require('../klasssectionsubject/klasssectionsubject.model');
var auditManager = require('../../config/auditmanager');


exports.createKlassSectionTimetable = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;

    var removeQuery = {
        'klassSectionId': req.params.klassSectionId,
        'schoolId': loggedUserData.schoolId,
        'academicYearId': academicYearData._id
    };
    Timetable.remove(removeQuery, function (err, data) {

        if (err) {
            return handleError(res, err);
        }

        var inputTimetableList = req.body;
        _.each(inputTimetableList, function (timeTableData) {
            auditManager.populateCreationAcademicAccountAudit(loggedUserData, timeTableData);
        });
        Timetable.create(inputTimetableList, function (err, data) {

            if (err) {
                return handleError(res, err);
            }

            return res.send(200, 'Success');
        });
    });
};


exports.getWeeklyTimeTableByKlassSectionId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    var klassId = mongoose.Types.ObjectId(req.params.klassId);
    var klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId);

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'klassSectionId': klassSectionId,
                'academicYearId': academicYearData._id
            };

            KlassSectionSubject.find(query)
                .lean()
                .populate(["staffId", "subjectTypeId"])
                .exec(function (err, docs) {

                    if (err) {
                        return next(err);
                    }

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSectionSubject.populate(docs, options, function (err, klassSectionSubjectList) {

                        if (err) {
                            return next(err);
                        }

                        _.each(klassSectionSubjectList, function (klassSectionSubject) {
                            var schoolSubjectData = klassSectionSubject.subjectTypeId;
                            klassSectionSubject.subjectName = schoolSubjectData.subjectName;
                            klassSectionSubject.subjectDescription = schoolSubjectData.description;

                            var staffData = klassSectionSubject.staffId;
                            var staffUserData = staffData.userId.toObject();
                            klassSectionSubject.staffName = staffUserData.name;
                            klassSectionSubject.staffMobileNumber = staffUserData.mobileNumber;
                            klassSectionSubject.staffEmail = staffUserData.email;
                        });
                        return next(err, klassSectionSubjectList);
                    });
                });
        },

        function (klassSectionSubjectList, next) {

            var query = {
                'schoolId': schoolId,
                'klassSectionId': klassSectionId,
                'academicYearId': academicYearData._id
            };

            Timetable.find(query)
                .populate("klassPeriodId")
                .lean()
                .exec(function (err, timeTableList) {
                    return next(err, timeTableList, klassSectionSubjectList);
                });
        },

        function (timeTableList, klassSectionSubjectList, next) {

            var klassSectionSubjectIdMapper = {};
            _.each(klassSectionSubjectList, function (klassSectionSubjectData) {
                klassSectionSubjectIdMapper[klassSectionSubjectData._id] = klassSectionSubjectData;
            });

            _.each(timeTableList, function (timeTableData) {
                var klassPeriodData = timeTableData.klassPeriodId;
                var klassSectionSubjectData = klassSectionSubjectIdMapper[timeTableData.klassSectionSubjectId] || getDefaultTimetableCellData(true);
                timeTableData.periodIndex = klassPeriodData.periodIndex;
                timeTableData.fromTime = klassPeriodData.fromTime;
                timeTableData.toTime = klassPeriodData.toTime;

                timeTableData.subjectName = klassSectionSubjectData.subjectName;
                timeTableData.subjectDescription = klassSectionSubjectData.subjectDescription;
                timeTableData.staffName = klassSectionSubjectData.staffName;
                timeTableData.staffMobileNumber = klassSectionSubjectData.staffMobileNumber;
                timeTableData.staffEmail = klassSectionSubjectData.staffEmail;
                timeTableData.isBreak = (!klassSectionSubjectData.isBreak) ? false : klassSectionSubjectData.isBreak;
            });
            return next(null, timeTableList);
        },

        function (timeTableList, next) {

            var orderedTimeTableList = _.sortBy(timeTableList, function (timeTableData) {
                var dayIndex = timeTableData.dayIndex;
                var periodIndex = timeTableData.periodIndex;
                return dayIndex + "." + periodIndex;
            });

            var groupedTimeTableByDayIndex = _.groupBy(orderedTimeTableList, function (timeTableData) {
                return "day-" + timeTableData.dayIndex;
            });
            return next(null, groupedTimeTableByDayIndex);
        },

        function (groupedTimeTableByDayIndex, next) {

            var inputData = {
                'schoolId': schoolId,
                'klassId': klassId,
                'academicYearId': academicYearData._id,
                'groupedTimeTableByDayIndex': groupedTimeTableByDayIndex
            };
            addDefaultTimetableDataIfPeriodNotExists(inputData, next);
        }

    ], function done(err, timeTableListByDayIndex) {

        if (err) {
            return handleError(res, err);
        }

        return res.status(200)
            .send(timeTableListByDayIndex);
    });
};


//inputData:{schoolId, klassId, academicYearId, groupedTimeTableByDayIndex}
function addDefaultTimetableDataIfPeriodNotExists(inputData, callback) {

    var schoolId = inputData.schoolId,
        klassId = inputData.klassId,
        academicYearId = inputData.academicYearId,
        groupedTimeTableByDayIndex = inputData.groupedTimeTableByDayIndex;

    var query = {
        'schoolId': schoolId,
        'klassId': klassId,
        'academicYearId': academicYearId
    };
    KlassPeriod.find(query)
        .sort({'periodIndex': 1})
        .lean()
        .exec(function (err, klassPeriodList) {

            if (err) return callback(err);

            _.each(groupedTimeTableByDayIndex, function (dayTimeTableList, dayInfo) {  //dayInfo='day-1'
                if (dayTimeTableList.length == klassPeriodList.length) {
                    return;
                }

                _.each(klassPeriodList, function (klassPeriodData, index) {
                    var periodIndex = index + 1;
                    var timeTablePeriodData = _.find(dayTimeTableList, {'periodIndex': periodIndex});
                    if (timeTablePeriodData) {
                        return;
                    }

                    var isBreak = (klassPeriodData.periodType == 'break');
                    var newlyAddedPeriodTimeTableData = getDefaultTimetableCellData(isBreak);
                    newlyAddedPeriodTimeTableData.periodIndex = klassPeriodData.periodIndex;
                    newlyAddedPeriodTimeTableData.fromTime = klassPeriodData.fromTime;
                    newlyAddedPeriodTimeTableData.toTime = klassPeriodData.toTime;
                    dayTimeTableList.push(newlyAddedPeriodTimeTableData);
                });
            });
            return callback(null, groupedTimeTableByDayIndex);
        });
}


function getDefaultTimetableCellData(isBreak) {

    var defaultData = {
        'subjectName': isBreak ? 'BRK' : '-',
        'subjectDescription': '-',
        'staffName': '-',
        'staffMobileNumber': '-',
        'staffEmail': '-',
        'isBreak': isBreak
    };
    return defaultData;
}

exports.getWeeklyTimeTableByStaffId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    var staffId = req.params.staffId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'staffId': mongoose.Types.ObjectId(staffId)
            };

            KlassSectionSubject.find(query)
                .lean()
                .populate(["subjectTypeId", "klassSectionId"])
                .exec(function (err, klassSectionSubjectList) {

                    if (err) {
                        return next(err);
                    }

                    _.each(klassSectionSubjectList, function (klassSectionSubject) {
                        var schoolSubjectData = klassSectionSubject.subjectTypeId;
                        klassSectionSubject.subjectName = schoolSubjectData.subjectName;
                        klassSectionSubject.subjectDescription = schoolSubjectData.description;

                        var klassSectionData = klassSectionSubject.klassSectionId;
                        klassSectionSubject.sectionName = klassSectionData.sectionName;
                        klassSectionSubject.klassSectionName = klassSectionData.klassSectionName;
                    });
                    return next(err, klassSectionSubjectList);
                });
        },

        function (klassSectionSubjectList, next) {

            var klassSectionSubjectIdList = _.map(klassSectionSubjectList, '_id');
            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'klassSectionSubjectId': {$in: klassSectionSubjectIdList}
            };

            Timetable.find(query)
                .populate("klassPeriodId")
                .lean()
                .exec(function (err, timeTableList) {
                    return next(err, timeTableList, klassSectionSubjectList);
                });
        },

        function (timeTableList, klassSectionSubjectList, next) {

            var klassSectionSubjectIdMapper = {};
            _.each(klassSectionSubjectList, function (klassSectionSubjectData) {
                klassSectionSubjectIdMapper[klassSectionSubjectData._id] = klassSectionSubjectData;
            });


            var staffWeeklyTimeTableList = [];
            var groupedTimeTableByDay = {};
            var timeTableGroupedByDayIndex = _.groupBy(timeTableList, 'dayIndex');
            var dayInfoObjectByDayIndex = {
                "1": "Monday",
                "2": "Tuesday",
                "3": "Wednesday",
                "4": "Thursday",
                "5": "Friday"
            };
            var dayIndexList = _.range(1, 6);
            _.each(dayIndexList, function (dayIndex) {
                var staffTimetableList = [];
                var dayTimeTableList = timeTableGroupedByDayIndex[dayIndex] || [];
                _.each(dayTimeTableList, function (timeTableData) {
                    var klassPeriodData = timeTableData.klassPeriodId; //periodIndex,  fromTime,  toTime
                    var klassSectionSubject = klassSectionSubjectIdMapper[timeTableData.klassSectionSubjectId] || {
                            'subjectName': "-", 'subjectDescription': "-", 'sectionName': "-", 'klassSectionName': "-"
                        };
                    var staffTimeTableData = {
                        'periodIndex': klassPeriodData.periodIndex,
                        'fromTime': klassPeriodData.fromTime,
                        'toTime': klassPeriodData.toTime,

                        'subjectName': klassSectionSubject.subjectName.toUpperCase(),
                        'subjectDescription': klassSectionSubject.subjectDescription,
                        'sectionName': klassSectionSubject.sectionName,
                        'klassSectionName': klassSectionSubject.klassSectionName
                    };
                    staffTimetableList.push(staffTimeTableData);
                });
                var orderedStaffTimetableList = _.sortBy(staffTimetableList, "periodIndex");
                groupedTimeTableByDay["day-" + dayIndex] = orderedStaffTimetableList;
                //return next(null,groupedTimeTableByDay);

                staffWeeklyTimeTableList.push({
                    'day': dayInfoObjectByDayIndex["" + dayIndex],
                    'periodList': orderedStaffTimetableList
                });
            });

            return next(null, staffWeeklyTimeTableList);
        }

    ], function (err, staffWeeklyTimeTableList) {

        if (err) {
            return handleError(res, err);
        }

        return res.status(200).send(staffWeeklyTimeTableList);
    });
};

function handleError(res, err) {
    return res.status(500).send(err);
}
