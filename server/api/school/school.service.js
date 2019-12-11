/**
 * Created by welcome on 8/24/2017.
 */



var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;
var auditManager = require('../../config/auditmanager');

var DateUtil = require("../common/date-util");
var Klass = require('../klass/klass.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassSectionStudent = require("../klasssectionstudent/klasssectionstudent.model");
var StudentAttendance = require("../studentattendance/studentattendance.model");
var KlassHoliday = require('../klassholiday/klassholiday.model');
var SchoolCalendar = require("../schoolcalendar/schoolcalendar.model");
var Staff = require("../staff/staff.model");
var Student = require("../student/student.model");
var LateArrival = require("../latearrival/latearrival.model");


////////////// START of SChool-Detailed-Attendance-Info /////////////////////
// input {currentDate, loggedUserData, academicYearData, schoolCalenderId, noDaysInAcademicYears}
// output   = {
//      'topPerformingClassList': {staffName, klassSectionName, presentPercentage},
//      'topPerformingTeacherList': {staffName, klassSectionName, presentPercentage},
//      'absentTeacherList': {staffName, klassSectionName, totalAbsentCount}
//      'absentStudentList': {studentName, studentRollNo, klassSectionName, totalAbsentCount},
//      'topPerformingClassChartData':{'presentPercentage', 'absentPercentage', 'lateArrivalPercentage'}
//      'topPerformingTeacherChartData':{'presentPercentage', 'absentPercentage'}
//}
exports.getDetailedAttendanceInfo = function (klassAttendanceInputData, callback) {

    var currentDate = klassAttendanceInputData.currentDate,
        loggedUserData = klassAttendanceInputData.loggedUserData,
        academicYearData = klassAttendanceInputData.academicYearData,
        schoolCalenderId = klassAttendanceInputData.schoolCalenderId,
        noDaysInAcademicYears = klassAttendanceInputData.noDaysInAcademicYears;

    var resultData = {
        'topPerformingClassList': [], //[{klassSectionName, staffName, presentPercentage}, ..]
        'topPerformingTeacherList': [], //[{staffName, klassSectionName, presentPercentage},..]
        'absentStudentList': [], //[{studentName, klassSectionName, totalAbsentCount},..]
        'absentTeacherList': [], //[{staffName, klassSectionName, totalAbsentCount},..]
        'topPerformingClassChartData': {}, //{'presentPercentage', 'absentPercentage', 'lateArrivalPercentage'}
        'topPerformingTeacherChartData': {} //{'presentPercentage', 'absentPercentage'}
    };

    async.waterfall([

        function (next) {
            SchoolCalendar.findByDate(currentDate, next);
        },

        function (schoolCalenderData, next) {
            klassAttendanceInputData.schoolCalenderId = schoolCalenderData._id;
            findTopPerformingClassAttendanceList(klassAttendanceInputData, function (err, data) {
                if (err) return next(err);

                resultData.topPerformingClassList = data.topPerformingClassList;
                resultData.topPerformingClassChartData = data.topPerformingClassChartData;
                return next(err);
            });
        },

        function (next) {

            findTopPerformingStaffAttendanceList(klassAttendanceInputData, function (err, topPerformingStaffList) {
                if (err) return next(err);

                resultData.topPerformingStaffList = topPerformingStaffList;
                var allStaffTotalPresentPercentage = 0;
                _.each(topPerformingStaffList, function (staffAttendanceData) {
                    allStaffTotalPresentPercentage += (staffAttendanceData.presentPercentage || 0);
                });
                var overAllStaffPresentPercentageVal = (allStaffTotalPresentPercentage / topPerformingStaffList.length);
                var overAllStaffPresentPercentage = toRoundDecimal(overAllStaffPresentPercentageVal, 2);
                var overAllStaffAbsentPercentage = 100 - overAllStaffPresentPercentage;
                resultData.topPerformingTeacherChartData = {
                    'presentPercentage': overAllStaffPresentPercentage,
                    'absentPercentage': overAllStaffAbsentPercentage
                };
                return next(err);
            });
        },


        function (next) {

            findAbsentStudentList(klassAttendanceInputData, function (err, absentStudentList) {
                if (err) return next(err);

                resultData.absentStudentList = absentStudentList;
                return next(err);
            });
        },

        function (next) {

            findAbsentStaffList(klassAttendanceInputData, function (err, absentTeacherList) {
                if (err) return next(err);

                resultData.absentTeacherList = absentTeacherList;
                return next(err);
            });
        }

    ], function done(err) {

        return callback(err, resultData);
    });
};


// inputData {currentDate, loggedUserData, academicYearData, schoolCalenderId, noDaysInAcademicYears}
// output   = {
//      topPerformingClassList:[{klassSectionName, staffName, presentPercentage}, ...],
//      topPerformingClassChartData:{presentPercentage, absentPercentage, lateArrivalPercentage}
// }
function findTopPerformingClassAttendanceList(inputData, callback) {

    var currentDate = inputData.currentDate,
        loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        schoolCalenderId = inputData.schoolCalenderId,
        noDaysInAcademicYears = inputData.noDaysInAcademicYears,
        schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {
            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(function (err, klassSectionStudentList) {

                    if (err) return next(err);

                    var groupedKlassSectionStudentsByKlassSectionId = _.groupBy(klassSectionStudentList, "klassSectionId");
                    return next(err, groupedKlassSectionStudentsByKlassSectionId);
                });
        },


        function (groupedKlassSectionStudentsByKlassSectionId, next) {

            KlassSection.find({'schoolId': schoolId})
                .populate('staffId')
                .lean()
                .exec(function (err, docs) {

                    if (err) {
                        return next(err);
                    }

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSection.populate(docs, options, function (err, klassSectionList) {

                        if (err) {
                            return next(err);
                        }

                        var klassSectionIdMappedAttendanceData = {};
                        _.each(klassSectionList, function (klassSectionData) {
                            var staffData = klassSectionData.staffId;
                            var staffUserData = staffData.userId.toObject();
                            var klassSectionStudentList = groupedKlassSectionStudentsByKlassSectionId[klassSectionData._id] || [];
                            var defaultAttendanceData = {
                                'totalStudentsHolidays': 0,
                                'totalStudentsLateArrivals': 0,
                                'noOfWorkingDays': 0,
                                'totalStudentsCount': klassSectionStudentList.length,
                                'presentPercentage': 0,
                                'klassSectionData': klassSectionData,
                                'staffUserData': staffUserData,
                                'klassId': klassSectionData.klassId
                            };
                            klassSectionIdMappedAttendanceData[klassSectionData._id] = defaultAttendanceData;
                        });
                        return next(err, klassSectionIdMappedAttendanceData);
                    });
                });
        },

        function (klassSectionIdMappedAttendanceData, next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id
            };
            KlassHoliday.find(query)
                .lean()
                .exec(function (err, klassHoildays) {
                    if (err) return next(err);

                    var groupedKlassHoildaysByKlassId = _.groupBy(klassHoildays, "klassId");
                    _.each(groupedKlassHoildaysByKlassId, function (groupedKlassHoildays, klassId) {
                        var noOfSystemHolidays = groupedKlassHoildays.length;
                        var noOfWorkingDays = noDaysInAcademicYears - noOfSystemHolidays;
                        _.each(klassSectionIdMappedAttendanceData, function (klassSectionAttendanceData, klassSectionId) {
                            if (klassSectionAttendanceData.klassId == klassId) {
                                klassSectionAttendanceData.noOfWorkingDays = noOfWorkingDays
                            }
                        });
                    });
                    next(err, klassSectionIdMappedAttendanceData);
                });
        },


        function (klassSectionIdMappedAttendanceData, next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id
            };
            StudentAttendance.find(query)
                .lean()
                .exec(function (err, studentAttendanceList) {
                    if (err) return next(err);

                    var groupedStudentAttendanceHoildaysByKlassSectionId = _.groupBy(studentAttendanceList, "klassSectionId");
                    _.each(groupedStudentAttendanceHoildaysByKlassSectionId, function (groupedStudentAttendanceHoildays, klassSectionId) {
                        var klassSectionAttendanceData = klassSectionIdMappedAttendanceData[klassSectionId];
                        klassSectionAttendanceData.totalStudentsHolidays = groupedStudentAttendanceHoildays.length;
                    });
                    return next(err, klassSectionIdMappedAttendanceData);
                });
        },


        function (klassSectionIdMappedAttendanceData, next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id
            };
            LateArrival.find(query)
                .lean()
                .exec(function (err, studentLateArrivalList) {
                    if (err) return next(err);

                    var groupedStudentLateArrivalsByKlassSectionId = _.groupBy(studentLateArrivalList, "klassSectionId");
                    _.each(groupedStudentLateArrivalsByKlassSectionId, function (groupedStudentLateArrivals, klassSectionId) {
                        var klassSectionAttendanceData = klassSectionIdMappedAttendanceData[klassSectionId];
                        klassSectionAttendanceData.totalStudentsLateArrivals = groupedStudentLateArrivals.length;
                    });
                    return next(err, klassSectionIdMappedAttendanceData);
                });
        },

        function (klassSectionIdMappedAttendanceData, next) {

            var attendanceDetailList = []; // {staffName, klassSectionName, presentPercentage}
            _.each(klassSectionIdMappedAttendanceData, function (klassSectionAttendanceData, klassSectionId) {

                var totalStudentsWorkingDays = klassSectionAttendanceData.totalStudentsCount * klassSectionAttendanceData.noOfWorkingDays;
                var totalStudentsHolidays = klassSectionAttendanceData.totalStudentsHolidays;
                var totalStudentsLateArrivals = klassSectionAttendanceData.totalStudentsLateArrivals;
                var totalStudentsPercentDays = totalStudentsWorkingDays - totalStudentsHolidays - totalStudentsLateArrivals;
                var klassSectionPresentPercentage = (totalStudentsPercentDays / totalStudentsWorkingDays) * 100;
                var presentPercentage = toRoundDecimal(klassSectionPresentPercentage, 2);
                var attendanceDetailData = {
                    'staffName': klassSectionAttendanceData.staffUserData.name,
                    'klassSectionName': klassSectionAttendanceData.klassSectionData.klassSectionName,
                    'presentPercentage': presentPercentage
                };
                attendanceDetailList.push(attendanceDetailData);
            });
            var orderedAttendanceDetailList = _.sortBy(attendanceDetailList, "presentPercentage");
            return next(null, klassSectionIdMappedAttendanceData, orderedAttendanceDetailList.reverse());
        },


        function (klassSectionIdMappedAttendanceData, topPerformingClassList, next) {

            var schoolAttendanceChartData = {
                'totalStudentsWorkingDays': 0,
                'totalStudentsHolidays': 0,
                'totalStudentsLateArrivals': 0,
                'totalStudentsPercentDays': 0
            };

            _.each(klassSectionIdMappedAttendanceData, function (klassSectionAttendanceData, klassSectionId) {

                var totalStudentsWorkingDays = klassSectionAttendanceData.totalStudentsCount * klassSectionAttendanceData.noOfWorkingDays;
                var totalStudentsHolidays = klassSectionAttendanceData.totalStudentsHolidays;
                var totalStudentsLateArrivals = klassSectionAttendanceData.totalStudentsLateArrivals;
                var totalStudentsPercentDays = totalStudentsWorkingDays - totalStudentsHolidays - totalStudentsLateArrivals;

                schoolAttendanceChartData.totalStudentsWorkingDays += totalStudentsWorkingDays;
                schoolAttendanceChartData.totalStudentsHolidays += totalStudentsHolidays;
                schoolAttendanceChartData.totalStudentsLateArrivals += totalStudentsLateArrivals;
                schoolAttendanceChartData.totalStudentsPercentDays += totalStudentsPercentDays;
            });

            var klassSectionPresentPercentage = (schoolAttendanceChartData.totalStudentsPercentDays / schoolAttendanceChartData.totalStudentsWorkingDays) * 100;
            var klassSectionAbsentPercentage = (schoolAttendanceChartData.totalStudentsHolidays / schoolAttendanceChartData.totalStudentsWorkingDays) * 100;
            var klassSectionLateArrivalPercentage = (schoolAttendanceChartData.totalStudentsLateArrivals / schoolAttendanceChartData.totalStudentsWorkingDays) * 100;
            var overAllTopPerformingClassChartData = {
                'presentPercentage': toRoundDecimal(klassSectionPresentPercentage, 2),
                'absentPercentage': toRoundDecimal(klassSectionAbsentPercentage, 2),
                'lateArrivalPercentage': toRoundDecimal(klassSectionLateArrivalPercentage, 2)
            };
            return next(null, topPerformingClassList, overAllTopPerformingClassChartData);
        }

    ], function (err, topPerformingClassList, topPerformingClassChartData) {

        if (err) return callback(err);

        var topPerformingClassInfo = {
            'topPerformingClassList': topPerformingClassList,
            'topPerformingClassChartData': topPerformingClassChartData
        };
        return callback(err, topPerformingClassInfo);
    });
}


// inputData {currentDate, loggedUserData, academicYearData, schoolCalenderId}
// output = [{studentName, studentRollNo, klassSectionName, totalAbsentCount},..]
function findAbsentStudentList(inputData, callback) {

    var currentDate = inputData.currentDate,
        loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        schoolCalenderId = inputData.schoolCalenderId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'schoolCalenderId': schoolCalenderId
            };
            StudentAttendance.find(query)
                .populate("studentId")
                .lean()
                .exec(next);
        },

        function (currentDateStudentAttendanceList, next) {

            var studentIdList = _.map(currentDateStudentAttendanceList, function (studentAttendanceData) {
                var studentData = studentAttendanceData.studentId;
                return studentData._id;
            });
            var query = {
                'schoolId': loggedUserData.schoolId,
                'studentId': {$in: studentIdList}
            };
            StudentAttendance.find(query)
                .lean()
                .exec(function (err, absentStudentsOtherDateAttendanceList) {
                    return next(err, currentDateStudentAttendanceList, absentStudentsOtherDateAttendanceList);
                });
        },

        function (currentDateStudentAttendanceList, absentStudentsOtherDateAttendanceList, next) {

            var klassSectionIdList = _.map(currentDateStudentAttendanceList, "klassSectionId");
            var query = {
                'schoolId': loggedUserData.schoolId,
                '_id': {$in: klassSectionIdList}
            };
            KlassSection.find(query)
                .lean()
                .exec(function (err, klassSectionList) {
                    return next(err, currentDateStudentAttendanceList, absentStudentsOtherDateAttendanceList, klassSectionList);
                });
        },

        function (currentDateStudentAttendanceList, absentStudentsOtherDateAttendanceList, klassSectionList, next) {

            var groupedAbsentStudentsOtherDateAttendanceListByStudentId = _.groupBy(absentStudentsOtherDateAttendanceList, "studentId");

            var klassSectionId2KlassSectionMapper = {};
            _.each(klassSectionList, function (klassSectionData) {
                klassSectionId2KlassSectionMapper[klassSectionData._id] = klassSectionData;
            });

            var absentStudentList = []; //studentName, studentRollNo, klassSectionName, totalAbsentCount
            _.each(currentDateStudentAttendanceList, function (studentAttendanceData) {

                var studentData = studentAttendanceData.studentId;
                var klassSectionData = klassSectionId2KlassSectionMapper[studentAttendanceData.klassSectionId];
                var totalAttendanceListByStudentId = groupedAbsentStudentsOtherDateAttendanceListByStudentId[studentData._id] || [];
                var absentStudentData = {
                    'studentName': studentData.name,
                    'studentRollNo': studentData.rollNo,
                    'klassSectionName': klassSectionData.klassSectionName,
                    'totalAbsentCount': totalAttendanceListByStudentId.length
                };
                absentStudentList.push(absentStudentData);
            });
            return next(null, absentStudentList);
        }

    ], callback)
}


// inputData {currentDate, loggedUserData, academicYearData, schoolCalenderId}
// output   = [{staffName, klassSectionName, presentPercentage}, ...]
function findTopPerformingStaffAttendanceList(inputData, callback) {

    var currentDate = inputData.currentDate,
        loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        schoolCalenderId = inputData.schoolCalenderId;

    async.waterfall([

        function (next) {

            var query = {'schoolId': loggedUserData.schoolId};
            KlassSection.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionList, next) {

            var query = {'schoolId': loggedUserData.schoolId, isDeleted: false};
            Staff.find(query)
                .populate('userId')
                .lean()
                .exec(function (err, staffList) {
                    return next(err, klassSectionList, staffList);
                });
        },

        function (klassSectionList, staffList, next) {

            var staffId2KlassSectionMapper = {};
            _.each(klassSectionList, function (klassSectionData) {
                staffId2KlassSectionMapper[klassSectionData.staffId] = klassSectionData;
            });

            var staffAttendanceList = [];
            _.each(staffList, function (staffData) {
                var klassSectionData = staffId2KlassSectionMapper[staffData._id];
                var klassSectionName = klassSectionData ? klassSectionData.klassSectionName : '-';

                var staffUserData = staffData.userId;
                var staffAttendanceData = {
                    'staffName': staffUserData.name,
                    'klassSectionName': klassSectionName,
                    'presentPercentage': 100 //TODO...
                };
                staffAttendanceList.push(staffAttendanceData);
            });
            return next(null, staffAttendanceList);
        }

    ], callback);
}


// inputData {currentDate, loggedUserData, academicYearData, schoolCalenderId}
// output = [{staffName, klassSectionName, totalAbsentCount},..]
function findAbsentStaffList(inputData, callback) {

    var currentDate = inputData.currentDate,
        loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        schoolCalenderId = inputData.schoolCalenderId;

    //TODO..
    return callback(null, []);
}

////////////// END of SChool-Detailed-Attendance-Info /////////////////////


////////////// START of School-Detailed-ExamResults-Info /////////////////////

var ExamType = require("../examtype/examtype.model");
var Exam = require("../exam/exam.model");
var StudentResult = require("../studentresult/studentresult.model");
var StudentMark = require("../studentmark/studentmark.model");
var KlassSectionExam = require("../klasssectionexam/klasssectionexam.model");


// input {academicYearData, loggedUserData, currentDate}
// output   = {
//      'topPerformingClassList': [{staffName, klassSectionName, examName, markPercentage}],
//      'topPerformingStudentList': [{studentName, klassSectionName, examName, markPercentage}],
//      'recentExamKlassSectionChartData':{
//              'UKG A':{'greaterThan90':20,'between70And90':60,'lessThan70':20, 'examName':'Quarterly'},
//              'I A':{}
//      }
//}
exports.getDetailedExamResultInfo = function (inputData, callback) {

    var loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        currentDate = inputData.currentDate;

    var detailedExamResultInfo = {
        'topPerformingClassResultList': [], //[{klassSectionName, staffName, examName, markPercentage}, ..]
        'topPerformingStudentResultList': [], //[{studentName, klassSectionName, examName, markPercentage},..]
        'recentExamKlassSectionChartData': {},
        klassSectionList: [],
        grades: []
    };

    async.series([

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id
            };
            ExamType.find(query)
                .lean()
                .exec(function (err, examTypeList) {
                    if (err) {
                        return next(err);
                    }
                    inputData.examTypeList = examTypeList;
                    return next(err);
                });
        },

        function (next) {

            var klassSectionExamInputData = {
                'currentDate': currentDate,
                'loggedUserData': loggedUserData
            };

            KlassSectionExam.findRecentlyCompletedByDate(klassSectionExamInputData, function (err, klassSectionRecentExamTypeMapper) {
                if (err) {
                    return next(err);
                }
                inputData.klassSectionRecentExamTypeMapper = klassSectionRecentExamTypeMapper;
                return next(err);
            });
        },

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId
            };
            KlassSection.find(query)
                .populate(['staffId', 'klassId'])
                .lean()
                .exec(function (err, docs) {

                    if (err) {
                        return next(err);
                    }

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSection.populate(docs, options, function (err, klassSectionList) {

                        if (err) {
                            return next(err);
                        }

                        _.each(klassSectionList, function (klassSectionData) {
                            var staffData = klassSectionData.staffId;
                            var klassData = klassSectionData.klassId;
                            var staffUserData = staffData.userId.toObject();
                            klassSectionData.staffName = staffUserData.name;
                            klassSectionData.order = klassData.order;
                        });
                        klassSectionList = _.sortBy(klassSectionList, 'order');
                        inputData.klassSectionList = klassSectionList;
                        return next(err);
                    });
                });
        },

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .populate("studentId")
                .lean()
                .exec(function (err, klassSectionStudentList) {
                    if (err) {
                        return next(err);
                    }
                    inputData.klassSectionStudentList = klassSectionStudentList;
                    return next(err);
                })
        },

        function (next) {

            inputData.studentResultList = [];
            var klassSectionMappedExamTypeList = _.values(inputData.klassSectionRecentExamTypeMapper);
            var examTypeIdList = _.map(klassSectionMappedExamTypeList, "_id");
            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': {$in: examTypeIdList}
            };
            StudentResult.find(query)
                .lean()
                .exec(function (err, studentResultList) {
                    if (err) {
                        return next(err);
                    }
                    inputData.studentResultList = studentResultList;
                    return next(err);
                });
        },

        function (next) {

            var examKlassSectionQueryList = [];
            var klassSectionRecentExamTypeMapper = inputData.klassSectionRecentExamTypeMapper;
            _.each(klassSectionRecentExamTypeMapper, function (examTypeData, klassSectionId) {
                var query = {
                    'examTypeId': examTypeData._id,
                    'klassSectionId': klassSectionId
                };
                examKlassSectionQueryList.push(query);
            });

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id
            };
            if (examKlassSectionQueryList.length)
                query['$or'] = examKlassSectionQueryList;


            Exam.find(query)
                .lean()
                .exec(function (err, examList) {
                    if (err) {
                        return next(err);
                    }
                    inputData.examList = examList;
                    return next(err);
                });
        },

        function (next) {

            var examIdList = _.map(inputData.examList, "_id");
            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'examId': {$in: examIdList}
            };
            StudentMark.find(query)
                .lean()
                .exec(function (err, studentMarkList) {
                    if (err) {
                        return next(err);
                    }

                    var examToExamDataMapper = {};
                    _.each(inputData.examList, function (examData) {
                        examToExamDataMapper[examData._id] = examData;
                    });

                    var klassSectionExamTypeToStudentMarkListMapper = {};
                    _.each(studentMarkList, function (studentMarkData) {
                        var examData = examToExamDataMapper[studentMarkData.examId];
                        var klassSectionId = examData.klassSectionId;
                        var examTypeId = examData.examTypeId;
                        var klassSectionExamTypeKey = klassSectionId + "_" + examTypeId;
                        var klassSectionStudentMarkList = klassSectionExamTypeToStudentMarkListMapper[klassSectionExamTypeKey] || [];
                        klassSectionStudentMarkList.push(studentMarkData);
                        klassSectionExamTypeToStudentMarkListMapper[klassSectionExamTypeKey] = klassSectionStudentMarkList;
                    });

                    inputData.klassSectionExamTypeToStudentMarkListMapper = klassSectionExamTypeToStudentMarkListMapper;
                    return next(err);
                });
        },

        function (next) {

            detailedExamResultInfo.topPerformingClassResultList = findTopPerformingClassExamResultList(inputData);
            detailedExamResultInfo.topPerformingStudentResultList = findTopPerformingStudentExamResultList(inputData);

            var recentExamKlassSectionChartData = generateKlassSectionExamResultChartData(inputData);
            var noneSelectedKey = 'None selected';
            var recentExamNoneSelectedChartData = recentExamKlassSectionChartData[noneSelectedKey];
            delete recentExamKlassSectionChartData[noneSelectedKey];

            detailedExamResultInfo.klassSectionList = _.keys(recentExamKlassSectionChartData);
            detailedExamResultInfo.klassSectionList.unshift(noneSelectedKey);//Make sure 'None selected' is on the top of the list

            recentExamKlassSectionChartData[noneSelectedKey] = recentExamNoneSelectedChartData;
            detailedExamResultInfo.recentExamKlassSectionChartData = recentExamKlassSectionChartData;
            detailedExamResultInfo.grades = [">90", "70-90", "<70"];
            next();
        }

    ], function done(err) {

        return callback(err, detailedExamResultInfo);
    });
};


//  inputData {loggedUserData, academicYearData, examTypeList, klassSectionList,
//              klassSectionStudentList, studentResultList, klassSectionRecentExamTypeMapper}
//  output =  {staffName, klassSectionName, examName, markPercentage},
function findTopPerformingClassExamResultList(inputData) {

    var loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        examTypeList = inputData.examTypeList,
        klassSectionList = inputData.klassSectionList,
        klassSectionStudentList = inputData.klassSectionStudentList,
        studentResultList = inputData.studentResultList,
        klassSectionRecentExamTypeMapper = inputData.klassSectionRecentExamTypeMapper;


    var examTypeId2ExamTypeDataMapper = {};
    _.each(examTypeList, function (examTypeData) {
        examTypeId2ExamTypeDataMapper[examTypeData._id] = examTypeData;
    });


    var klassSectionId2StudentResultListMapper = _.groupBy(studentResultList, 'klassSectionId');
    var topPerformingClassList = _.map(klassSectionList, function (klassSectionData) {

        var klassSectionId = klassSectionData._id;
        var klassSectionStudentResultList = klassSectionId2StudentResultListMapper[klassSectionId] || [];
        var examTypeId2StudentResultListMapper = _.groupBy(klassSectionStudentResultList, 'examTypeId');

        var klassSectionRecentExamTypeData = klassSectionRecentExamTypeMapper[klassSectionId] || {'name': '-'}; //name, description
        var recentExamTypeStudentResultList = examTypeId2StudentResultListMapper[klassSectionRecentExamTypeData._id] || [];

        var examTypeResultTotalMarks = 0;
        var examTypeResultObtainedMarks = 0;
        _.each(recentExamTypeStudentResultList, function (studentResultData) {
            examTypeResultTotalMarks += (+studentResultData.totalMarks);
            examTypeResultObtainedMarks += (+studentResultData.marksObtained);
        });

        var examTypeResultPercentage = (examTypeResultObtainedMarks / examTypeResultTotalMarks) * 100;
        var klassSectionRecentExamResultPercentage = toRoundDecimal(examTypeResultPercentage, 2);

        var klassSectionResultData = {
            'klassId': klassSectionData.klassId,
            'klassSectionId': klassSectionData._id,
            'klassSectionName': klassSectionData.klassSectionName,
            'staffName': klassSectionData.staffName,
            'examName': klassSectionRecentExamTypeData.name,
            'markPercentage': klassSectionRecentExamResultPercentage
        };
        return klassSectionResultData;
    });

    var orderedTopPerformingClassList = _.sortBy(topPerformingClassList, 'markPercentage');
    return orderedTopPerformingClassList.reverse();
}


// inputData {loggedUserData, academicYearData, examTypeList, klassSectionList,
//              klassSectionStudentList, studentResultList, klassSectionRecentExamTypeMapper}
// output   = [{klassId, klassSectionId, klassSectionName, studentName, studentId, examName, markPercentage}, ...]
function findTopPerformingStudentExamResultList(inputData) {

    var loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        examTypeList = inputData.examTypeList,
        klassSectionList = inputData.klassSectionList,
        klassSectionStudentList = inputData.klassSectionStudentList,
        studentResultList = inputData.studentResultList,
        klassSectionRecentExamTypeMapper = inputData.klassSectionRecentExamTypeMapper;
    var numberOfTopStudentCount = 2;

    var examTypeId2ExamTypeDataMapper = {};
    _.each(examTypeList, function (examTypeData) {
        examTypeId2ExamTypeDataMapper[examTypeData._id] = examTypeData;
    });

    var studentId2KlassSectionStudentMapper = {};
    _.each(klassSectionStudentList, function (klassSectionStudentData) {
        var studentData = klassSectionStudentData.studentId;
        studentId2KlassSectionStudentMapper[studentData._id] = klassSectionStudentData;
    });


    var klassSectionId2StudentResultListMapper = _.groupBy(studentResultList, 'klassSectionId');
    var topPerformingStudentList = [];
    _.each(klassSectionList, function (klassSectionData) {

        var klassSectionId = klassSectionData._id;
        var klassSectionStudentResultList = klassSectionId2StudentResultListMapper[klassSectionId] || [];
        var examTypeId2StudentResultListMapper = _.groupBy(klassSectionStudentResultList, 'examTypeId');

        var klassSectionRecentExamTypeData = klassSectionRecentExamTypeMapper[klassSectionId] || {'name': '-'}; //name, description
        var recentExamTypeStudentResultList = examTypeId2StudentResultListMapper[klassSectionRecentExamTypeData._id] || [];

        var orderedExamTypeStudentResultList = _.sortBy(recentExamTypeStudentResultList, 'marksObtained');
        var topPerformingStudentResultList = (orderedExamTypeStudentResultList.length > 2) ?
            orderedExamTypeStudentResultList.slice(orderedExamTypeStudentResultList.length - numberOfTopStudentCount) : orderedExamTypeStudentResultList;
        topPerformingStudentResultList.reverse();
        _.each(topPerformingStudentResultList, function (studentResultData) {

            var examTypeResultTotalMarks = studentResultData.totalMarks;
            var examTypeResultObtainedMarks = studentResultData.marksObtained;
            var examTypeResultPercentage = (examTypeResultObtainedMarks / examTypeResultTotalMarks) * 100;
            var studentRecentExamResultPercentage = toRoundDecimal(examTypeResultPercentage, 2);

            var klassSectionStudentData = studentId2KlassSectionStudentMapper[studentResultData.studentId] || {'studentId': {'name': '-'}};
            var studentData = klassSectionStudentData.studentId;

            var resultData = {
                'klassId': klassSectionData.klassId,
                'klassSectionId': klassSectionData._id,
                'klassSectionName': klassSectionData.klassSectionName,
                'studentId': studentData.name,
                'studentName': studentData.name,
                'examName': klassSectionRecentExamTypeData.name,
                'markPercentage': studentRecentExamResultPercentage
            };
            topPerformingStudentList.push(resultData);
        });
    });

    var orderedTopPerformingStudentList = _.sortBy(topPerformingStudentList, 'markPercentage');
    return orderedTopPerformingStudentList.reverse();
}


// inputData {loggedUserData, academicYearData, examTypeList, klassSectionList,
//            klassSectionStudentList, studentResultList,
//            klassSectionRecentExamTypeMapper, klassSectionExamTypeToStudentMarkListMapper
//          }
// output   = {
//              'UKG A':{'greaterThan90':20,'between70And90':60,'lessThan70':20, 'examName':'Quarterly'},
//              'I A':{}
//      }
function generateKlassSectionExamResultChartData(inputData) {

    var loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData,
        examTypeList = inputData.examTypeList,
        klassSectionList = inputData.klassSectionList,
        klassSectionStudentList = inputData.klassSectionStudentList,
        studentResultList = inputData.studentResultList,
        klassSectionRecentExamTypeMapper = inputData.klassSectionRecentExamTypeMapper,
        klassSectionExamTypeToStudentMarkListMapper = inputData.klassSectionExamTypeToStudentMarkListMapper;

    var examTypeId2ExamTypeDataMapper = {};
    _.each(examTypeList, function (examTypeData) {
        examTypeId2ExamTypeDataMapper[examTypeData._id] = examTypeData;
    });

    var studentId2KlassSectionStudentMapper = {};
    _.each(klassSectionStudentList, function (klassSectionStudentData) {
        var studentData = klassSectionStudentData.studentId;
        studentId2KlassSectionStudentMapper[studentData._id] = klassSectionStudentData;
    });

    var allKlassSectionExamResultData = {
        'greaterThan90': 0, 'between70And90': 0, 'lessThan70': 0, 'allKlassSectionStudentMarkCount': 0
    };
    var klassSectionExamResultChartData = {}; //'UKG A':{'greaterThan90':20,'between70And90':60,'lessThan70':20, 'examName':'Quarterly'}
    _.each(klassSectionList, function (klassSectionData) {

        var klassSectionId = klassSectionData._id;
        var klassSectionRecentExamTypeData = klassSectionRecentExamTypeMapper[klassSectionId] || {'name': '-'}; //name, description

        var klassSectionExamTypeKey = klassSectionId + "_" + klassSectionRecentExamTypeData._id;
        var recentExamKlassSectionStudentMarkList = klassSectionExamTypeToStudentMarkListMapper[klassSectionExamTypeKey] || [];

        var klassSectionExamResultData = {
            'klassId': klassSectionData.klassId,
            'klassSectionId': klassSectionData._id,
            'klassSectionName': klassSectionData.klassSectionName,
            'recentExamName': klassSectionRecentExamTypeData.name
        };
        var greaterThan90 = 0, between70And90 = 0, lessThan70 = 0;
        _.each(recentExamKlassSectionStudentMarkList, function (studentMarkData) {
            if (studentMarkData.marks > 90) {
                greaterThan90++;
            } else if (studentMarkData.marks >= 70 && studentMarkData.marks <= 90) {
                between70And90++;
            } else if (studentMarkData.marks < 70) {
                lessThan70++;
            }
        });

        var greaterThan90Percentage = (greaterThan90 / recentExamKlassSectionStudentMarkList.length) * 100;
        klassSectionExamResultData[">90"] = toRoundDecimal(greaterThan90Percentage, 2);
        var between70And90Percentage = (between70And90 / recentExamKlassSectionStudentMarkList.length) * 100;
        klassSectionExamResultData["70-90"] = toRoundDecimal(between70And90Percentage, 2);
        var lessThan70Percentage = (lessThan70 / recentExamKlassSectionStudentMarkList.length) * 100;
        klassSectionExamResultData["<70"] = toRoundDecimal(lessThan70Percentage, 2);

        var gradeChartDataList = [
            {x: " ", y: isNaN(greaterThan90Percentage) ? 0 : greaterThan90Percentage},
            {x: " ", y: isNaN(between70And90Percentage) ? 0 : between70And90Percentage},
            {x: " ", y: isNaN(lessThan70Percentage) ? 0 : lessThan70Percentage}
        ];

        klassSectionExamResultData['gradeChartData'] = gradeChartDataList;
        klassSectionExamResultChartData[klassSectionData.klassSectionName] = klassSectionExamResultData;

        allKlassSectionExamResultData.greaterThan90 += greaterThan90;
        allKlassSectionExamResultData.between70And90 += between70And90;
        allKlassSectionExamResultData.lessThan70 += lessThan70;
        allKlassSectionExamResultData.allKlassSectionStudentMarkCount += recentExamKlassSectionStudentMarkList.length;
    });


    var greaterThan90Percentage = (allKlassSectionExamResultData.greaterThan90 / allKlassSectionExamResultData.allKlassSectionStudentMarkCount) * 100;
    var between70And90Percentage = (allKlassSectionExamResultData.between70And90 / allKlassSectionExamResultData.allKlassSectionStudentMarkCount) * 100;
    var lessThan70Percentage = (allKlassSectionExamResultData.lessThan70 / allKlassSectionExamResultData.allKlassSectionStudentMarkCount) * 100;
    var schoolKlassSectionExamResultData = {
        'klassId': '-',
        'klassSectionId': '-',
        'klassSectionName': 'None selected',
        'recentExamName': '-',
        '>90': toRoundDecimal(greaterThan90Percentage, 2),
        '70-90': toRoundDecimal(between70And90Percentage, 2),
        '<70': toRoundDecimal(lessThan70Percentage, 2)
    };
    var gradeChartDataList = [
        {x: " ", y: isNaN(greaterThan90Percentage) ? 0 : greaterThan90Percentage},
        {x: " ", y: isNaN(between70And90Percentage) ? 0 : between70And90Percentage},
        {x: " ", y: isNaN(lessThan70Percentage) ? 0 : lessThan70Percentage}
    ];
    schoolKlassSectionExamResultData['gradeChartData'] = gradeChartDataList;

    klassSectionExamResultChartData[schoolKlassSectionExamResultData.klassSectionName] = schoolKlassSectionExamResultData;

    return klassSectionExamResultChartData;
}
////////////// END of School-Detailed-ExamResults-Info /////////////////////


////////////// START of School-Detailed-ExamResults-Info /////////////////////


// input {academicYearData, loggedUserData}
// output   = {
//      'classSectionWiseEnrollementList':
//          [
//              {'male':0, 'female':0, 'total':0, 'klassId', 'klassSectionId', 'klassSectionName'},
//              {}
//          ],
//      'classWiseEnrollementChartData':
//              [
//                  {data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5","6","8"]}, //BOYS
//                  {data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5","6","8"]}, //GIRLS
//                  {data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5","6","8"]} //STUDENTS
//              ],
//       'classWiseEnrollmentChartDataAxisLabels': ['i', 'ii',...]
//      }
//}
// Note: Here 'data' has x-->className , y-->numberOfBoys/Girls/Students percentageVal
//            'labels' has array of y values from data
exports.getDetailedSchoolEnrollmentInfo = function (inputData, callback) {

    var loggedUserData = inputData.loggedUserData,
        academicYearData = inputData.academicYearData;

    var detailedEnrollmentResultInfo = {
        //[{'male':0, 'female':0, 'total':0, 'klassId', 'klassSectionId', 'klassSectionName'}, ..]
        'classSectionWiseEnrollementList': [],

        //  [
        //      {data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5","6","8"]}, //BOYS
        //      {data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5","6","8"]}, //GIRLS
        //      {data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5","6","8"]} //STUDENTS
        //  ]
        'classWiseEnrollementChartData': [],

        // ['i', 'ii']
        'classWiseEnrollmentChartDataAxisLabels': []
    };


    async.waterfall([


        function (next) {

            var query = {'schoolId': loggedUserData.schoolId};
            Klass.find(query)
                .lean()
                .exec(function (err, klassList) {
                    if (err) return next(err);

                    inputData.klassList = klassList;
                    return next(err);
                });
        },

        function (next) {

            var query = {'schoolId': loggedUserData.schoolId};
            KlassSection.find(query)
                .sort({'klassSectionName': 1})
                .lean()
                .exec(function (err, klassSectionList) {
                    if (err) return next(err);

                    inputData.klassSectionList = klassSectionList;
                    return next(err);
                });
        },

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(function (err, klassSectionStudentList) {
                    if (err) return next(err);

                    inputData.klassSectionStudentList = klassSectionStudentList;
                    return next(err);
                });
        },

        function (next) {

            Student.find({'schoolId': loggedUserData.schoolId, 'isDeleted': false})
                .lean()
                .exec(function (err, studentList) {
                    if (err) return next(err);

                    inputData.studentList = studentList;
                    return next(err);
                });
        },

        function (next) {

            var klassList = inputData.klassList,
                klassSectionList = inputData.klassSectionList,
                klassSectionStudentList = inputData.klassSectionStudentList,
                studentList = inputData.studentList;

            var studentId2StudentDataMapper = {};
            _.each(studentList, function (studentData) {
                studentId2StudentDataMapper[studentData._id] = studentData;
            });
            inputData.studentId2StudentDataMapper = studentId2StudentDataMapper;

            var klassSectionId2EnrollmentData = {};
            _.each(klassSectionStudentList, function (klassSectionStudentData) {
                var enrollmentData = klassSectionId2EnrollmentData[klassSectionStudentData.klassSectionId] ||
                    {'male': 0, 'female': 0, 'total': 0};

                enrollmentData.total++;
                var studentData = studentId2StudentDataMapper[klassSectionStudentData.studentId];
                var genderVal = studentData.gender.toLowerCase();
                if (genderVal == "male") {
                    enrollmentData.male++;
                } else if (genderVal == "female") {
                    enrollmentData.female++;
                }
                klassSectionId2EnrollmentData[klassSectionStudentData.klassSectionId] = enrollmentData;
            });


            var classSectionWiseEnrollementList = _.map(klassSectionList, function (klassSectionData) {
                var enrollmentData = klassSectionId2EnrollmentData[klassSectionData._id] ||
                    {'male': 0, 'female': 0, 'total': 0};
                enrollmentData.klassId = klassSectionData.klassId;
                enrollmentData.klassSectionId = klassSectionData._id;
                enrollmentData.klassSectionName = klassSectionData.klassSectionName;
                return enrollmentData;
            });
            detailedEnrollmentResultInfo.classSectionWiseEnrollementList = _.sortBy(classSectionWiseEnrollementList, "total");
            detailedEnrollmentResultInfo.classSectionWiseEnrollementList = detailedEnrollmentResultInfo.classSectionWiseEnrollementList.reverse()
            return next();
        },

        function (next) {

            var klassId2KlassDataMapper = {};
            var klassList = inputData.klassList;
            _.each(klassList, function (klassData) {
                klassId2KlassDataMapper[klassData._id] = klassData;
            });


            var klassId2EnrollmentChartDataMapper = {};
            var classSectionWiseEnrollementList = detailedEnrollmentResultInfo.classSectionWiseEnrollementList;
            var groupedClassSectionWiseEnrollementList = _.groupBy(classSectionWiseEnrollementList, 'klassId');
            _.each(groupedClassSectionWiseEnrollementList, function (classSectionEnrollmentList, klassId) {

                var klassData = klassId2KlassDataMapper[klassId];
                var klassEnrollmentChartData = klassId2EnrollmentChartDataMapper[klassId] || {
                        'klassBoysCount': 0,
                        'klassGirlsCount': 0,
                        'klassStudentsCount': 0,
                        'klassName': klassData.klassName
                    };
                _.each(classSectionEnrollmentList, function (klassSectionenrollmentData) {
                    klassEnrollmentChartData.klassBoysCount += klassSectionenrollmentData.male;
                    klassEnrollmentChartData.klassGirlsCount += klassSectionenrollmentData.female;
                    klassEnrollmentChartData.klassStudentsCount += klassSectionenrollmentData.total;
                });
                klassId2EnrollmentChartDataMapper[klassId] = klassEnrollmentChartData;
            });


            var classWiseEnrollmentChartDataAxisLabels = [];
            var klassWiseBoyChartDataList = [], klassWiseBoyChartLabelsList = [];
            var klassWiseGirlChartDataList = [], klassWiseGirlChartLabelsList = [];
            var klassWiseStudentChartDataList = [], klassWiseStudentChartLabelsList = [];
            klassList = _.sortBy(klassList,"order");
            _.each(klassList, function (klassData) {

                var klassEnrollmentChartData = klassId2EnrollmentChartDataMapper[klassData._id] || {
                        'klassBoysCount': 0,
                        'klassGirlsCount': 0,
                        'klassStudentsCount': 0,
                        'klassName': klassData.klassName
                    };
                var klassName = klassData.klassName;
                classWiseEnrollmentChartDataAxisLabels.push(klassName);


                ///////////////START of  KLASS-BOYS //////////////
                var klassBoysEnrollmentData = {
                    'x': klassName, 'y': klassEnrollmentChartData.klassBoysCount
                };
                klassWiseBoyChartDataList.push(klassBoysEnrollmentData);
                klassWiseBoyChartLabelsList.push(klassEnrollmentChartData.klassBoysCount);
                ///////////////END of  KLASS-BOYS //////////////

                ///////////////START of  KLASS-GIRLS //////////////
                var klassGirlsEnrollmentData = {
                    'x': klassName, 'y': klassEnrollmentChartData.klassGirlsCount
                };
                klassWiseGirlChartDataList.push(klassGirlsEnrollmentData);
                klassWiseGirlChartLabelsList.push(klassEnrollmentChartData.klassGirlsCount);
                ///////////////END of  KLASS-GIRLS //////////////

                ///////////////START of  KLASS-STUDENTS //////////////
                var klassStudentsEnrollmentData = {
                    'x': klassName, 'y': klassEnrollmentChartData.klassStudentsCount
                };
                klassWiseStudentChartDataList.push(klassStudentsEnrollmentData);
                klassWiseStudentChartLabelsList.push(klassEnrollmentChartData.klassStudentsCount);
                ///////////////END of  KLASS-STUDENTS //////////////
            });

            detailedEnrollmentResultInfo.classWiseEnrollementChartData = [
                {'data': klassWiseBoyChartDataList, 'labels': klassWiseBoyChartLabelsList},
                {'data': klassWiseGirlChartDataList, 'labels': klassWiseGirlChartLabelsList},
                {'data': klassWiseStudentChartDataList, 'labels': klassWiseStudentChartLabelsList}
            ];

            detailedEnrollmentResultInfo.classWiseEnrollmentChartDataAxisLabels = classWiseEnrollmentChartDataAxisLabels;
            next();
        }
    ], function done(err) {

        return callback(err, detailedEnrollmentResultInfo);
    });
};

function toRoundDecimal(inputValue, roundOfCount) {
    var roundedVal = +inputValue.toFixed(roundOfCount);
    return isNaN(roundedVal) ? 0 : roundedVal;
}