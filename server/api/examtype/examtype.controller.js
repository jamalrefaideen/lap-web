'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var handleSuccess = require("../common/app.util").handleSuccess;
var handleError = require("../common/app.util").handleError;


var ExamTypeModel = require("./examtype.model");
var ExamTypeService = require("./examtype.service");
var auditManager = require('../../config/auditmanager');


exports.createSchoolExamType = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var examTypeData = req.body;
    auditManager.populateCreationAcademicAccountAudit(loggedUserData, examTypeData);

    ExamTypeModel.create(examTypeData, function(err, data){
        if (err) {
            return res.status(500).send(err);
        }
        return res.status(200).send(data);
    });
};



exports.getSchoolExamTypes = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var academicYearId = loggedUserData.academicYearData._id;
    ExamTypeService.getExamTypesBySchool(schoolId, academicYearId)
        .then(handleSuccess(res))
        .catch(handleError(res))
};