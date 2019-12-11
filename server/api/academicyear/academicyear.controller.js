'use strict';

var async = require("async");
var AcademicYear = require('./academicyear.model');
var SchoolCalendar = require("../schoolcalendar/schoolcalendar.model");
var auditManager = require('../../config/auditmanager');

exports.getAcademicYearList = function(req, res){

    var loggedUserData = req.loggedUserData;
    AcademicYear.find({'schoolId':loggedUserData.schoolId})
        .populate(["fromDate", "toDate"])
        .lean()
        .exec(function(err, academicYearList){

            if (err) {
                return handleError(res, err);
            }

            return res.send(200, academicYearList);
        });
};


exports.getCurrentAcademicYearData = function(req, res){

    var loggedUserData = req.loggedUserData;
    AcademicYear.findOne({'schoolId':loggedUserData.schoolId, 'isCurrent':true})
        .populate(["fromDate", "toDate"])
        .lean()
        .exec(function(err, currentAcademicYearData){

            if (err) {
                return handleError(res, err);
            }

            return res.send(200, currentAcademicYearData);
        });
};

exports.getAcademicYearDataById = function(req, res){

    var loggedUserData = req.loggedUserData;
    var academicYearId= req.params.academicYearId;

    AcademicYear.findById(academicYearId)
        .populate(["fromDate", "toDate"])
        .lean()
        .exec(function(err, academicYearData){

            if (err) {
                return handleError(res, err);
            }

            return res.send(200, academicYearData);
        });
};

exports.createAcademicYearData = function(req, res){

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;

    async.waterfall([

        function(next){

            SchoolCalendar.findByDate(inputData.fromDate, next);
        },

        function(fromDateSchoolCalenderData, next){

            SchoolCalendar.findByDate(inputData.toDate, function(err, toDateSchoolCalenderData){
                return next(err, fromDateSchoolCalenderData, toDateSchoolCalenderData);
            });
        },

        function(fromDateSchoolCalenderData, toDateSchoolCalenderData, next){

            var academicYearData = {
                'fromDate':fromDateSchoolCalenderData._id,
                'toDate':toDateSchoolCalenderData._id
            };
            if(!inputData.isCurrent){
                return next(null, academicYearData);
            }

            var query = {'schoolId':loggedUserData.schoolId};
            var updateData = {'isCurrent':false};
            auditManager.populateUpdateAudit(loggedUserData, updateData);
            AcademicYear.update(query, {$set:updateData}, function(err){
                academicYearData.isCurrent = true;
                return next(err, academicYearData);
            });
        },

        function(academicYearData, next){

            auditManager.populateCreationAccountAudit(loggedUserData, academicYearData);
            AcademicYear.create(academicYearData, next);
        }

    ], function done(err, savedAcademicYearData){

        if (err) {
            return handleError(res, err);
        }

        return res.send(200, savedAcademicYearData);
    });
};

exports.updateAcademicYearData = function(req, res){

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;

    async.waterfall([

        function(next){

            SchoolCalendar.findByDate(inputData.fromDate, next);
        },

        function(fromDateSchoolCalenderData, next){

            SchoolCalendar.findByDate(inputData.toDate, function(err, toDateSchoolCalenderData){
                return next(err, fromDateSchoolCalenderData, toDateSchoolCalenderData);
            });
        },

        function(fromDateSchoolCalenderData, toDateSchoolCalenderData, next){

            var academicYearData = {
                'fromDate':fromDateSchoolCalenderData._id,
                'toDate':toDateSchoolCalenderData._id
            };
            if(!inputData.isCurrent){
                academicYearData.isCurrent = false;
                return next(null, academicYearData);
            }

            var query = {'schoolId':loggedUserData.schoolId};
            var updateData = {'isCurrent':false};
            auditManager.populateUpdateAudit(loggedUserData, updateData);
            AcademicYear.update(query, {$set:updateData},{multi:true}, function(err){
                academicYearData.isCurrent = true;
                return next(err, academicYearData);
            });
        },

        function(academicYearData, next){

            auditManager.populateUpdateAudit(loggedUserData, academicYearData);
            AcademicYear.update({_id:inputData._id},{$set:academicYearData}, next);
        }

    ], function done(err, savedAcademicYearData){

        if (err) {
            return handleError(res, err);
        }

        return res.send(200, "Success");
    });
};


function handleError(res, err) {
    return res.send(500, err);
}
