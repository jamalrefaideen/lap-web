'use strict';
var _ = require('lodash');
var async = require('async');

var KlassSection = require('./klasssection.model');
var KlassSectionStudent = require("../klasssectionstudent/klasssectionstudent.model");
var Student = require("../student/student.model");
var Parent = require("../parent/parent.model");

var auditManager = require('../../config/auditmanager');

var mongoose = require("mongoose");

exports.createKlassSectionByKlass =  function(req,res){

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var klassId = req.params.klassId;

    _.each(inputData,function(inputObj){
        inputObj.klassId = klassId;
        auditManager.populateCreationAccountAudit(loggedUserData, inputObj);
    });

    KlassSection.create(inputData,function(err,data){

        if(err){
            return handleError(res,err)
        }
        res.send(200,"Success");
    });
};

exports.getKlassSectionDetailsById =  function(req,res){

    var klassSectionId = req.params.klassSectionId;
    KlassSection.findById(klassSectionId)
        .populate("staffId")
        .lean()
        .exec(function(err, doc){

            if(err){
                return handleError(res,err)
            }

            var options = {
                path: 'staffId.userId',
                model: 'User'
            };
            KlassSection.populate(doc, options, function (err, klassSectionData) {

                if(err){
                    return handleError(res,err)
                }

                var staffData = klassSectionData.staffId;
                var staffUserData = staffData.userId.toObject();
                klassSectionData.staffName = staffUserData.name;
                klassSectionData.staffMobileNumber = staffUserData.mobileNumber;
                klassSectionData.staffEmail = staffUserData.email;
                return res.send(200 , klassSectionData);
            });
        });
};


exports.getKlassSectionsByKlass =  function(req,res){

    var klassId = req.params.klassId;

    KlassSection.find({klassId:klassId})
        .lean()
        .exec(function(err,sections){

        if(err){
            return handleError(res,err)
        }

        res.send(200,sections);
    })

};


exports.getKlassSectionList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var klassId = req.params.klassId;

    async.waterfall([

        function(next){

            var query = {
                'schoolId': schoolId,
                'klassId': klassId
            };
            KlassSection.find(query)
                .lean()
                .exec(function(err, klassSectionList){
                    return next(err, klassSectionList);
                });
        }

    ], function done(err, klassSectionList){

        if(err){
            return handleError(res, err)
        }

        return res.send(200, klassSectionList);
    });
};


////////////// START of KlassSection-Enrollment-List /////////////////////
// output   = [{'name' 'rollNo','gender', 'profilePictureUrl', 'bloodGroup'}, {}, ...]
exports.getKlassSectionEnrollmentList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var klassSectionId = req.params.klassSectionId;

    async.waterfall([

        function(next){

            var query = {
                'schoolId':loggedUserData.schoolId,
                'academicYearId':academicYearData._id,
                'klassSectionId':klassSectionId
            };
            KlassSectionStudent(query)
                .lean()
                .exec(next);
        },

        function(klassSectionStudentList, next){

            var studentIdList = _.map(klassSectionStudentList, "studentId");
            var query = {
                'schoolId':loggedUserData.schoolId,
                '_id':{$in:studentIdList},
                'isDeleted': false
            };
            Student.find(query)
                .lean()
                .exec(function(err, studentList){
                    return next(err, klassSectionStudentList, studentList);
                })
        },

        function(klassSectionStudentList, studentList, next){

            var studentId2StudentDataMapper = {};
            _.each(studentList, function(studentData){
                studentId2StudentDataMapper[studentData._id] = studentData;
            });

            var klassSectionEnrollmentList = _.map(klassSectionStudentList, function(klassSectionStudentData){
                var studentData = studentId2StudentDataMapper[klassSectionStudentData.klassSectionId];
                var enrollmentData = {
                    'name':studentData.name,
                    'rollNo':studentData.rollNo,
                    'gender':studentData.gender,
                    'profilePictureUrl':studentData.profilePictureUrl,
                    'bloodGroup':studentData.bloodGroup
                };
                return enrollmentData;
            });
            return next(null, klassSectionEnrollmentList);
        }

    ], function done(err, klassSectionEnrollmentList){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(klassSectionEnrollmentList);
    });
};

////////////// END of KlassSection-Detailed-Enrollment-List /////////////////////




////////////// START of KlassSection-Detailed-Enrollment-List /////////////////////
// output   = [{
//              'name' 'rollNo', 'admissionNo', 'fatherName', 'motherName',
//              'gender' 'DOB', 'profilePictureUrl', 'bloodGroup',
//              'email', 'mobileNumber','address', 'occupation'
//              }, {}, ...
//             ]
exports.getKlassSectionDetailedEnrollmentList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var klassSectionId = req.params.klassSectionId;
    var klassSectionDetails = {};

    async.waterfall([

        function(next){

            KlassSection.findById(klassSectionId)
                .lean()
                .exec(function(err,data){
                    if(err){
                        return next(err);
                    }

                    klassSectionDetails = data;
                    next();
                });
        },

        function(next){

            var query = {
                'schoolId':loggedUserData.schoolId,
                'academicYearId':academicYearData._id,
                'klassSectionId':klassSectionId,
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(next);
        },

        function(klassSectionStudentList, next){

            var studentIdList = _.map(klassSectionStudentList, "studentId");
            var query = {
                'schoolId':loggedUserData.schoolId,
                '_id':{$in:studentIdList},
                'isDeleted': false
            };
            Student.find(query)
                .lean()
                .exec(function(err, studentList){
                    return next(err, klassSectionStudentList, studentList);
                })
        },

        function(klassSectionStudentList, studentList, next){

            var parentIdList = _.map(studentList, "parentId");
            var query = {
                'schoolId':loggedUserData.schoolId,
                '_id':{$in:parentIdList}
            };
            Parent.find(query)
                .lean()
                .populate("userId")
                .exec(function(err, studentParentList){
                    return next(err, klassSectionStudentList, studentList, studentParentList);
                });
        },


        function(klassSectionStudentList, studentList, studentParentList, next){

            var studentId2StudentDataMapper = {};
            _.each(studentList, function(studentData){
                studentId2StudentDataMapper[studentData._id] = studentData;
            });

            var parentId2ParentDataMapper = {};
            _.each(studentParentList, function(parentData){
                parentId2ParentDataMapper[parentData._id] = parentData;
            });

            var klassSectionEnrollmentList = _.map(klassSectionStudentList, function(klassSectionStudentData){
                var studentData = studentId2StudentDataMapper[klassSectionStudentData.studentId];
                var parentData = parentId2ParentDataMapper[studentData.parentId];
                var parentUserData = parentData.userId;

                var enrollmentData = {
                    'name':studentData.name,
                    'rollNo':studentData.rollNo,
                    'admissionNo':studentData.admissionNo,
                    'fatherName':studentData.fatherName,
                    'motherName':studentData.motherName,
                    'gender':studentData.gender,
                    'DOB':new Date(studentData.DOB),
                    'profilePictureUrl':"",
                    'bloodGroup':studentData.bloodGroup,
                    'email':parentUserData.email,
                    'mobileNumber':parentUserData.mobileNumber,
                    'address':parentData.address,
                    'occupation':parentData.occupation
                };
                return enrollmentData;
            });
            return next(null, klassSectionEnrollmentList);
        }

    ], function done(err, klassSectionEnrollmentList){

        if (err) {
            return handleError(res, err)
        }
        var resultData = {
            klassSectionDetails : klassSectionDetails,
            klassSectionEnrollmentList: klassSectionEnrollmentList
        };
        return res.status(200).send(resultData);
    });
};

////////////// END of KlassSection-Detailed-Enrollment-List /////////////////////





exports.updateKlassSection =  function(req,res){

    var loggedUserData = req.loggedUserData;
    var klassSectionId = req.params.klassSectionId;
    var updateData = req.body; //sectionName, klassSectionName, staffId

    var query = {"_id":mongoose.Types.ObjectId(klassSectionId)};

    delete updateData._id;
    auditManager.populateUpdateAudit(loggedUserData, updateData);

    KlassSection.update(query,{$set:updateData}, function(err,data){

        if(err){
            return handleError(res,err);
        }
        res.send(200,"KlassSection updated successfully!");
    });
};




function handleError(res, err) {
    return res.send(500, err);
}
