'use strict';
var async = require('async');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;
var _ = require('lodash');

var Parent = require('./parent.model');
var School = require('../school/school.model');
var Student = require('../student/student.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var SchoolUtil = require('../school/school.util');
var KlassHolidayService = require('../klassholiday/klassholiday.service');

var KlassSectionStudent = require('../klasssectionstudent/klasssectionstudent.model');
var StudentBehaviour = require('../studentbehaviour/studentbehaviour.model');
var BehaviouralScore = require('../behaviouralscore/behaviouralscore.model');
var BehaviouralAttribute = require('../behaviouralattribute/behaviouralattribute.model');

var KlassPeriod = require('../klassperiod/klassperiod.model');
var Staff = require('../staff/staff.model');
var Timetable = require('../timetable/timetable.model');
var AcademicYear = require('../academicyear/academicyear.model');


var NotificationTargetTypeInstance = require('../notificationtargettypeinstance/notificationtargettypeinstance.model');

var StudentAttendance = require('../studentattendance/studentattendance.model');
var LateArrival = require('../latearrival/latearrival.model');

var DiaryTargetInstance = require('../diarytargetinstance/diarytargetinstance.model');
var Diary = require('../diary/diary.model');
var KlassSectionSubject = require('../klasssectionsubject/klasssectionsubject.model');

var Event = require('../event/event.model');

exports.getDashboardDetailsByUserId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var schoolId = loggedUserData.schoolId;
    var date = req.params.date;

    var resultObj = {
        parentDetails: {}, students: [], activeStudent: {}, studentKlassDetails: {},
        attendanceDetails: {}, behaviourDetails: {}, attributeChartDetails: [], timetable: {}, diary: {},
        events: {}, currentSchoolCalendarId: null, unreadNotificationsCount: 0, schoolInfo: null
    };

    async.waterfall([

        //Find parent by user
        function (next) {

            var query = {$or: [{'userId': userId}, {'secondaryUserId': userId}]};
            Parent.findOne(query)
                .lean()
                .exec(function (err, parentObj) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.parentDetails = parentObj;
                    next(err, parentObj)
                });
        },

        //FInd student(s) by parent and set active student

        function (parentObj, next) {
            Student.find({parentId: parentObj._id, 'isDeleted': false})
                .lean()
                .exec(function (err, studentList) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.students = studentList;
                    resultObj.activeStudent = studentList[0];
                    next();
                });
        },
        function (next) {
            School.findById(loggedUserData.schoolId)
                .lean()
                .then(function (schoolData) {
                    resultObj.schoolInfo = schoolData;
                    next();
                })
                .catch(next)
        },

        //find active student class section

        function (next) {

            findDashboardDetailsByStudent(loggedUserData, resultObj, date, function (err, finalResultObj) {
                if (err) {
                    return next(err);
                }
                resultObj = finalResultObj;
                next();
            });

        }], function done(err, data) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(resultObj);
    });
};


exports.getDashboardDetailsByStudent = function (req, res) {

    var studentId = req.params.studentId;
    var date = req.params.date;
    var loggedUserData = req.loggedUserData;

    var resultObj = {
        activeStudent: {},
        studentKlassDetails: {},
        attendanceDetails: {},
        behaviourDetails: {},
        attributeChartDetails: [],
        timetable: {},
        diary: {},
        events: [],
        currentSchoolCalendarId: null,
        unreadNotificationsCount: 0
    };

    Student.findById(studentId, function (err, activeStudent) {

        if (err) {
            return handleError(res, err);
        }

        resultObj.activeStudent = activeStudent;
        findDashboardDetailsByStudent(loggedUserData, resultObj, date, function (err, finalResultObj) {

            if (err) {
                return handleError(res, err);
            }

            return res.status(200).send(resultObj);
        });
    });
};


function findDashboardDetailsByStudent(loggedUserData, resultObj, date, callback) {

    var userId = loggedUserData.userId;
    var schoolId = loggedUserData.schoolId;
    var academicYearData = loggedUserData.academicYearData;
    var today = new Date();
    var processingData = {
        behaviouralScoreList: [],
        behaviouralAttributeList: [],
        studentBehaviourList: []
    };
    async.waterfall([

        function (next) {
            var query = {
                userId: userId,
                studentId: resultObj.activeStudent._id,
                isNotificationRead: false
            };
            NotificationTargetTypeInstance.find(query)
                .count()
                .exec(function (err, unreadNotificationsCount) {

                    if (err) {
                        return next(err);
                    }

                    resultObj.unreadNotificationsCount = unreadNotificationsCount;
                    next();
                })
        },


        //find active student class section
        function (next) {

            KlassSectionStudent.findOne({studentId: resultObj.activeStudent._id})
                .populate('klassSectionId')
                .lean()
                .exec(function (err, klassSectionStudentDetails) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.studentKlassDetails = klassSectionStudentDetails;
                    next(err, resultObj.activeStudent)
                });
        },

        function (activeStudent, next) {
            var klassId = resultObj.studentKlassDetails.klassId;
            SchoolUtil.getAllKlassWorkingSchoolCalenders(klassId, academicYearData, today)
                .then(function (allKlassWorkingCalenders) {
                    resultObj.attendanceDetails.allKlassWorkingCalenders = allKlassWorkingCalenders;
                    resultObj.attendanceDetails.noOfWorkingDaysInKlass = allKlassWorkingCalenders.length;
                    next(null, activeStudent);
                })
                .catch(next)
        },


        function (activeStudent, next) {
            var klassId = resultObj.studentKlassDetails.klassId;
            KlassHolidayService.getKlassCustomHolidays(klassId, academicYearData._id, today)
                .then(function (allHolidays) {
                    resultObj.attendanceDetails.holidayDates = _.map(allHolidays, function (holiday) {
                        return holiday.schoolCalendarId.date;
                    });
                    next(null, activeStudent);
                })
                .catch(next)
        },

        //find the attendance data for the active student
        function (activeStudent, next) {
            var activeStudentId = activeStudent._id;
            StudentAttendance.find({studentId: activeStudentId})
                .populate('schoolCalendarId')
                .lean()
                .exec(function (err, studentattendanceList) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.attendanceDetails.absentCount = studentattendanceList.length;
                    resultObj.attendanceDetails.absentDates = _.map(studentattendanceList, function (attendanceObj) {
                        return attendanceObj.schoolCalendarId.date;
                    });
                    resultObj.attendanceDetails.absentPercentage = Math.round((resultObj.attendanceDetails.absentCount / resultObj.attendanceDetails.noOfWorkingDaysInKlass) * 100);
                    next(null, studentattendanceList)
                });
        },

        //find the late arrivals data for the active student
        function (studentattendanceList, next) {
            var activeStudentId = resultObj.activeStudent._id;
            LateArrival.find({studentId: activeStudentId})
                .populate('schoolCalendarId').lean()
                .exec(function (err, lateArrivalList) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.attendanceDetails.lateCount = lateArrivalList.length;
                    resultObj.attendanceDetails.lateDates = _.map(lateArrivalList, function (lateArrivalObj) {
                        return lateArrivalObj.schoolCalendarId.date;
                    });
                    resultObj.attendanceDetails.latePercentage = Math.round((resultObj.attendanceDetails.lateCount / resultObj.attendanceDetails.noOfWorkingDaysInKlass) * 100);

                    //calculate present
                    var presentCalenders = _.filter(resultObj.attendanceDetails.allKlassWorkingCalenders, function (workingCalender) {
                        var absentCalender = _.find(studentattendanceList, function (studentAttendance) {
                            return studentAttendance.schoolCalendarId._id.toString() == workingCalender._id.toString();
                        });
                        var lateCalender = _.find(lateArrivalList, function (lateArrival) {
                            return lateArrival.schoolCalendarId._id.toString() == workingCalender._id.toString();
                        });
                        return (absentCalender || lateCalender) ? false : true;
                    });
                    resultObj.attendanceDetails.presentDates = _.map(presentCalenders, "date");
                    resultObj.attendanceDetails.presentPercentage = 100 - (resultObj.attendanceDetails.absentPercentage + resultObj.attendanceDetails.latePercentage);
                    next()
                });
        },

        function (next) {

            BehaviouralScore.find({schoolId: schoolId})
                .lean()
                .sort({'scoreValue': -1})
                .exec(function (err, behaviouralScoreData) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.behaviourDetails.scoresLegendData = _.map(behaviouralScoreData, function (behaviouralScore) {
                        return behaviouralScore.displayName;
                    });
                    processingData.behaviouralScoreList = behaviouralScoreData;
                    next();
                })
        },

        function (next) {

            BehaviouralAttribute.find({schoolId: schoolId})
                .lean()
                .exec(function (err, behaviouralAttributeData) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.behaviourDetails.attributesLegendData = _.map(behaviouralAttributeData, function (behaviouralAttribute) {
                        return behaviouralAttribute.attributeName;
                    });
                    processingData.behaviouralAttributeList = behaviouralAttributeData;
                    next();
                })
        },


        //find the behaviour data for the active student
        function (next) {

            StudentBehaviour.find({klassSectionStudentId: resultObj.studentKlassDetails._id})
                .populate(['behaviouralScoreId', 'behaviouralAttributeId'])
                .lean()
                .exec(function (err, behaviourList) {
                    if (err) {
                        return next(err);
                    }

                    var validBehaviourList = _.filter(behaviourList, function (behaviourData) {
                        return behaviourData.behaviouralAttributeId && behaviourData.behaviouralScoreId;
                    });

                    processingData.studentBehaviourList = _.sortBy(validBehaviourList, function (validBehaviourObj) {
                        return parseInt(validBehaviourObj.behaviouralScoreId.scoreValue);
                    });
                    resultObj.behaviourDetails.totalApplauds = validBehaviourList.length;
                    var attributeNameMap = _.groupBy(processingData.studentBehaviourList, function (behaviourObj) {
                        return behaviourObj.behaviouralAttributeId.attributeName;
                    });
                    var scoreValueMap = _.groupBy(processingData.studentBehaviourList, function (behaviourObj) {
                        return behaviourObj.behaviouralScoreId.displayName;
                    });

                    resultObj.behaviourDetails.attributeList = [];
                    resultObj.behaviourDetails.scoreList = _.map(processingData.behaviouralScoreList, function (behaviourScoreObj) {
                        var scoreObj = {};
                        scoreObj[behaviourScoreObj.displayName] = 0;
                        return scoreObj;

                    });
                    _.forEach(attributeNameMap, function (behaviourValues, key) {
                        var attrObj = {};
                        attrObj[key] = behaviourValues.length;
                        resultObj.behaviourDetails.attributeList.push(attrObj);
                    });

                    _.forEach(resultObj.behaviourDetails.scoreList, function (scoreObj) {
                        _.forEach(scoreObj, function (value, key) {
                            scoreObj[key] = scoreValueMap[key] ? scoreValueMap[key].length : 0;
                        });
                    });

                    next()
                });
        },

        //find student behaviour chart data
        function (next) {

            _.each(processingData.behaviouralScoreList, function (scoreObj) {
                var scoreValueList = [];
                _.each(processingData.behaviouralAttributeList, function (attributeObj) {

                    var axisObj = {
                        x: attributeObj.attributeName
                    };

                    axisObj.y = _.filter(processingData.studentBehaviourList, function (behaviourObj) {
                        return behaviourObj.behaviouralAttributeId._id.toString() == attributeObj._id.toString() && behaviourObj.behaviouralScoreId._id.toString() == scoreObj._id.toString();
                    }).length;

                    scoreValueList.push(axisObj);
                });
                resultObj.attributeChartDetails.push(scoreValueList);
            });
            next();

        },

        //find the klass period data for the active student

        function (next) {


            KlassPeriod.find({klassId: resultObj.studentKlassDetails.klassId})
                .lean()
                .sort({"periodIndex": 1})
                .exec(function (err, klassPeriods) {

                    if (err) {
                        return next(err);
                    }

                    var periodIds = _.map(klassPeriods, '_id');
                    next(err, periodIds);
                });
        },

        //find the timetable data for the active student

        function (periodIds, next) {

            var currentDate = new Date(date);
            var dayIndex = currentDate.getDay();
            var timeTableQuery = {
                'klassSectionId': resultObj.studentKlassDetails.klassSectionId,
                'dayIndex': dayIndex,
                'klassPeriodId': {'$in': periodIds},
                'schoolId': schoolId,
                'academicYearId': academicYearData._id
            };
            Timetable.find(timeTableQuery)
                .populate(['klassPeriodId', 'klassSectionSubjectId'])
                .lean()
                .exec(function (err, timeTableRecords) {

                    if (err) {
                        return next(err);
                    }

                    populateStaffByKlassSection(timeTableRecords, function (err, staffList, populatedTimetableRecords) {

                        if (err) {
                            return next(err);
                        }

                        populatedTimetableRecords = _.sortBy(populatedTimetableRecords, function (tableObj) {
                            return tableObj.klassPeriodId.periodIndex;
                        });

                        resultObj.timetable = _.map(populatedTimetableRecords, function (timetableObj) {

                            var subjectTeacherObj = _.find(staffList, function (staffObj) {
                                if (timetableObj.klassSectionSubjectId) {
                                    return staffObj._id.toString() == timetableObj.klassSectionSubjectId.staffId.toString();
                                }
                            });

                            var componentDisplayObj = {
                                time: timetableObj.klassPeriodId.fromTime,
                                title: timetableObj.klassSectionSubjectId ? (timetableObj.klassSectionSubjectId.subjectTypeId.subjectName + "").toUpperCase() : 'BRK',
                                description: subjectTeacherObj ? 'Teacher : ' + subjectTeacherObj.userId.name : '--'
                            };

                            if (!timetableObj.klassSectionSubjectId) {
                                componentDisplayObj.circleColor = '#fed44e';
                            }

                            return componentDisplayObj;
                        });
                        next();
                    });
                });

        },
        //find school calendar id for current date
        function (next) {

            var currentDate = new Date(date);
            SchoolCalendar.findByDate(currentDate, function (err, calendarObj) {
                if (err) {
                    return next(err)
                }
                resultObj.currentSchoolCalendarId = calendarObj._id.toString();
                next();
            });
        },


        //This method used to fetch diary target data for specific date
        function (next) {

            DiaryTargetInstance.find({studentId: resultObj.activeStudent._id})
                .lean()
                .exec(function (err, diaryData) {

                    if (err) {
                        return next(err)
                    }
                    var diaryIds = _.map(diaryData, function (diaryTargetObj) {
                        return diaryTargetObj.diaryId;
                    });
                    next(err, diaryIds);
                })


        },
        //This method used to fetch diary data for specific date
        function (diaryIds, next) {

            Diary.find({_id: {$in: diaryIds}, schoolCalendarId: resultObj.currentSchoolCalendarId})
                .sort({createdOn: -1})
                .populate(['subjectTypeId', 'schoolCalendarId', 'createdBy'])
                .lean()
                .exec(function (err, diaryListData) {

                    if (err) {
                        return next(err)
                    }
                    resultObj.diary = diaryListData;
                    next();
                });
        },

        //This method used to fetch events for specific date
        function (next) {

            var eventInputData = {
                'loggedUserData': loggedUserData,
                'schoolCalendarId': resultObj.currentSchoolCalendarId,
                "studentId": resultObj.activeStudent._id
            };
            Event.findByLoggedUserAndSchoolCalendar(eventInputData, function (err, eventList) {

                if (err) {
                    return next(err)
                }

                resultObj.events = eventList;
                next();
            });
        }

    ], function (err, data) {

        callback(err, resultObj);
    });
}

function populateStaffByKlassSection(timeTableRecords, callback) {

    Timetable.populate(timeTableRecords,
        {
            path: 'klassSectionSubjectId.subjectTypeId',
            model: 'SubjectType',
            options: {lean: true}
        }, function (err, populatedTimeTableRecords) {

            if (err) {
                return callback(err);
            }
            var staffIds = _.map(populatedTimeTableRecords, function (tableObj) {
                if (tableObj.klassSectionSubjectId) {
                    return tableObj.klassSectionSubjectId.staffId;
                }
            });
            Staff.find({_id: {'$in': staffIds}, isDeleted: false})
                .populate('userId')
                .lean()
                .exec(function (err, staffs) {
                    callback(err, staffs, populatedTimeTableRecords)
                })
        });
}



function handleError(res, err) {
    return res.send(500, err);
}