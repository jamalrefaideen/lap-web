'use strict';

var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;


var School = require('./school.model');
var User = require('../user/user.model');
var SchoolUserRole = require('../schooluserrole/schooluserrole.model');
var Staff = require('../staff/staff.model');
var Klass = require('../klass/klass.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassSectionStudent = require("../klasssectionstudent/klasssectionstudent.model");
var Student = require("../student/student.model");
var SchoolService = require("./school.service");
var DateUtil = require('../../api/common/date-util');


var Constants = require('../dataconstants/constants');
var auditManager = require('../../config/auditmanager');


//Create School/User/schoolUserRole/Staff
exports.createSchoolDetails = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;

    async.waterfall([

        function (next) {
            var schoolData = inputData.schoolDetails; //{schoolName,schoolAddress,board,principalNo,phNo,email,fax}
            auditManager.populateCreationAccountAudit(loggedUserData, schoolData);
            School.create(schoolData, next);
        },

        function (schoolData, next) {
            var adminData = inputData.adminDetails; //{name,email,phone}
            adminData.password = "lap123";
            auditManager.populateCreationAccountAudit(loggedUserData, adminData);
            adminData.schoolId = schoolData._id; //Dont change the order.. it should be the newly created school refrence

            User.create(adminData, function (err, schoolUser) {
                return next(err, schoolData, schoolUser);
            });
        },

        function (schoolData, schoolUser, next) {
            var schoolUserRoleObj = {
                'roleId': Constants.UserRoleTypes.SCHOOL_ADMIN.roleId,
                'userId': schoolUser._id
            };
            auditManager.populateCreationAccountAudit(loggedUserData, schoolUserRoleObj);
            schoolUserRoleObj.schoolId = schoolData._id;//Dont change the order.. it should be the newly created school refrence

            SchoolUserRole.create(schoolUserRoleObj, function (err) {
                return next(err, schoolData, schoolUser);
            });
        },

        function (schoolData, schoolUser, next) {
            var staffDetailObj = {
                'rollNo': 1,
                'userId': schoolUser._id
            };
            auditManager.populateCreationAccountAudit(loggedUserData, staffDetailObj);
            staffDetailObj.schoolId = schoolData._id;//Dont change the order.. it should be the newly created school refrence

            Staff.create(staffDetailObj, next);
        }
    ], function done(err) {

        if (err) {
            return handleError(res, err);
        }
        return res.json(200, "Success");
    });
};

exports.getSchoolList = function (req, res) {

    School.find()
        .lean()
        .exec(function (err, schoolList) {

            if (err) {
                return handleError(res, err);
            }
            return res.json(200, schoolList);
        });
};

exports.getSchoolByLoggedUser = function(req,res){

    var loggedUserData = req.loggedUserData;
    var schoolId=loggedUserData.schoolId;

    School.findById(schoolId)
        .lean()
        .exec(function (err, SchoolData) {

            if(err){
                return handleError(res,err)
            }

            return res.send(200,SchoolData);

        });
};

exports.getSchoolById = function (req, res) {

    async.waterfall([

        function (next) {

            School.findById(req.params.id)
                .lean()
                .exec(next);
        },

        function (schoolData, next) {

            var query = {
                'roleId': Constants.UserRoleTypes.SCHOOL_ADMIN.roleId,
                'schoolId': req.params.id
            };
            SchoolUserRole.findOne(query)
                .lean()
                .populate("userId")
                .exec(function (err, schoolUserRoleData) {

                    if(err) return next(err);

                    var schoolUserData = schoolUserRoleData.userId;
                    schoolData.adminInfo = schoolUserData;
                    return next(null, schoolData);
            });
        }

    ], function done(err, schoolDetailData) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(schoolDetailData)
    });
};

exports.updateSchoolDetails = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolData = req.body.schoolData;
    var userData = req.body.userData;
    var schoolId = schoolData._id;
    var userId = userData._id;

    async.series([

        function (next) {
            delete schoolData._id;
            auditManager.populateUpdateAudit(loggedUserData, schoolData);
            School.update({_id: schoolId}, {$set: schoolData}, next);
        },

        function (next) {
            delete userData._id;
            auditManager.populateUpdateAudit(loggedUserData, userData);
            User.update({_id: userId}, {$set: userData}, next);
        }

    ],function(err,data){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send("Success")

    })


};


// input {date}
// output   = {
//      'topPerformingClassList': {staffName, klassSectionName, presentPercentage},
//      'topPerformingTeacherList': {staffName, klassSectionName, presentPercentage},
//      'absentTeacherList': {staffName, klassSectionName, totalAbsentCount}
//      'absentStudentList': {studentName, studentRollNo, klassSectionName, totalAbsentCount},
//      'topPerformingClassChartData':{'presentPercentage', 'absentPercentage', 'lateArrivalPercentage'}
//      'topPerformingTeacherChartData':{'presentPercentage', 'absentPercentage'}
//}
exports.getDetailedAttendanceInfo = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;

    var inputData = req.body;
    var currentDate = new Date(inputData.date);
    var academicYearFromDate = academicYearData.fromDate.date;
    var noDaysInAcademicYears = DateUtil.daysBetween(academicYearFromDate, currentDate);

    var attendanceInputData = {
        'currentDate':currentDate,
        'loggedUserData':loggedUserData,
        'academicYearData':academicYearData,
        'noDaysInAcademicYears':noDaysInAcademicYears,
        'schoolCalenderId':null
    };

    SchoolService.getDetailedAttendanceInfo(attendanceInputData, function(err, attendanceData){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(attendanceData);
    });
};




// output   = {
//      'topPerformingClassList': {staffName, klassSectionName, examName, markPercentage},
//      'topPerformingStudentList': {studentName, klassSectionName, examName, markPercentage},
//      'recentExamKlassSectionChartData':{
//              'UKG A':{'greaterThan90':20,'between70And90':60,'lessThan70':20, 'examName':'Quarterly'},
//              'I A':{}
//      }
//}
exports.getDetailedExamResultInfo = function(req, res){

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var inputData = req.body;
    var currentDate = new Date(inputData.date);

    var examResultInputData = {
        'loggedUserData':loggedUserData,
        'academicYearData':academicYearData,
        'currentDate':currentDate
    };

    SchoolService.getDetailedExamResultInfo(examResultInputData, function(err, attendanceData){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(attendanceData);
    });
};


////////////// START of School-Enrollment-List /////////////////////
// output   = [{'male':0, 'female':0, 'total':0, 'klassId', 'klassSectionId', 'klassSectionName'}, {}, ... ]
exports.getSchoolEnrollmentList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;

    async.waterfall([

        function(next){

            var query = {'schoolId':loggedUserData.schoolId};
            KlassSection.find(query)
                .sort({'klassSectionName': 1})
                .lean()
                .exec(next);
        },

        function(klassSectionList, next){

            var query = {
                'schoolId':loggedUserData.schoolId,
                'academicYearId':academicYearData._id,
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(function(err, klassSectionStudentList){
                    return next(err, klassSectionList, klassSectionStudentList);
                });
        },

        function(klassSectionList, klassSectionStudentList, next){

            Student.find({'schoolId':loggedUserData.schoolId,'isDeleted': false})
                .lean()
                .exec(function(err, studentList){
                    return next(err, klassSectionList, klassSectionStudentList, studentList);
                })
        },

        function(klassSectionList, klassSectionStudentList, studentList, next){

            var studentId2StudentDataMapper = {};
            _.each(studentList, function(studentData){
                studentId2StudentDataMapper[studentData._id] = studentData;
            });


            var klassSectionId2EnrollmentData = {};
            _.each(klassSectionStudentList, function(klassSectionStudentData){
                var enrollmentData = klassSectionId2EnrollmentData[klassSectionStudentData.klassSectionId] ||
                    {'male':0, 'female':0, 'total':0};

                enrollmentData.total++;
                var studentData = studentId2StudentDataMapper[klassSectionStudentData.studentId];
                var genderVal = studentData.gender.toLowerCase();
                if(genderVal=="male"){
                    enrollmentData.male++;
                }else if(genderVal=="female"){
                    enrollmentData.female++;
                }
                klassSectionId2EnrollmentData[klassSectionStudentData.klassSectionId] = enrollmentData;
            });

            var allKlassEnrollmentList = _.map(klassSectionList, function(klassSectionData){
                var enrollmentData = klassSectionId2EnrollmentData[klassSectionData._id] ||
                    {'male':0, 'female':0, 'total':0};
                enrollmentData.klassId = klassSectionData.klassId;
                enrollmentData.klassSectionId = klassSectionData._id;
                enrollmentData.klassSectionName = klassSectionData.klassSectionName;
                return enrollmentData;
            });
            return next(null, allKlassEnrollmentList);
        }


    ], function done(err, allKlassEnrollmentList){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(allKlassEnrollmentList);
    });
};

////////////// END of School-Enrollment-List /////////////////////




////////////// START of Detiled-School-Enrollment-Info /////////////////////

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
//      'classWiseEnrollmentChartDataAxisLabels':['i', 'ii', ..]
//      }
//}
// Note: Here 'data' has x-->className , y-->numberOfBoys/Girls/Students percentageVal
//            'labels' has array of y values from data
exports.getDetailedSchoolEnrollmentInfo = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var enrollmentInputData = {
        'loggedUserData':loggedUserData,
        'academicYearData':academicYearData
    };

    SchoolService.getDetailedSchoolEnrollmentInfo(enrollmentInputData, function(err, enrollmentData){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(enrollmentData);
    });
};

////////////// END of Detiled-School-Enrollment-Info /////////////////////



function handleError(res, err) {
    return res.status(500).send(err);
}