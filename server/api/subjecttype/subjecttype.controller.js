'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;
var auditManager = require('../../config/auditmanager');

var SubjectType = require('./subjecttype.model');

exports.createSchoolSubjectType = function(req, res){

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;

    _.each(inputData,function (inputObj) {
        auditManager.populateCreationAccountAudit(loggedUserData, inputObj);
    });

    SubjectType.create(inputData,function(err, data){

        if(err){
            return handleError(res, err)
        }

        return res.send(200,'Success');
    });
};

exports.getAllSchoolSubjects = function(req, res){

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    var query = {
        'schoolId': schoolId
    };
    SubjectType.find(query)
        .lean()
        .exec(function(err, schoolSubjects){

            if(err){
                return handleError(res, err)
            }

            return res.status(200).send( schoolSubjects);
        });
};



exports.getSchoolSubjectObj = function(req, res){

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var schoolSubjectId = req.params.schoolsubjectid;
    var query = {
        'schoolId': schoolId,
        '_id' : schoolSubjectId
    };
    SubjectType.findOne(query)
        .lean()
        .exec(function(err, schoolSubjectObj){

            if(err){
                return handleError(res, err)
            }

            return res.status(200).send( schoolSubjectObj);
        });
};


exports.updateSchoolSubject=function(req, res){
    var loggedUserData = req.loggedUserData;
    var schoolSubjectInputData = req.body;
    var schoolSubjectId = schoolSubjectInputData._id;
    delete schoolSubjectInputData._id;
    auditManager.populateUpdateAudit(loggedUserData, schoolSubjectInputData);
    SubjectType.update({_id:schoolSubjectId},{$set:schoolSubjectInputData},function(err,data){
        if(err){
            return handleError(res,err)
        }

        return res.send(200,'Success');
    });

};



function handleError(res, err) {
    return res.status(500).send( err);
}

