'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;

var auditManager = require('../../config/auditmanager');
var ExamService = require('./exam.service');
var SchoolCalenderModel = require("../schoolcalendar/schoolcalendar.model");
var KlassSectionExam = require("../klasssectionexam/klasssectionexam.model");
var AppUtil = require("../common/app.util");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;

exports.createExamsToClassSection = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var requestInfo = req.body;
    var examInfo = _.pick(requestInfo, ["examTypeId", "klassSectionId", "subjectExamList"]);
    examInfo.schoolId = loggedUserData.schoolId;
    var examDates = _.map(examInfo.subjectExamList, "examDate");

    var klassSectionExamInputData = {'schoolCalenderList':[],'examInfo':examInfo, 'loggedUserData':loggedUserData};
    var buildExamList = _.partial(getSubjectExamListToCreate, examInfo, loggedUserData);
    var generateKlassSectionExam = _.partial(createKlassSectionExam, klassSectionExamInputData);
    var convertDatesToSchoolCalender = _.partial(convertDatesToSchoolCalenderIds, examDates, klassSectionExamInputData);
    ExamService.removeKlassSectionExams(examInfo.examTypeId, examInfo.klassSectionId)
        .then(convertDatesToSchoolCalender) // get school calender  id list for all subject exam dates
        .then(buildExamList)// build exam list to  create
        .then(ExamService.createExams)
        .then(generateKlassSectionExam)
        .then(handleSuccess(res))
        .catch(handleError(res))
};


//klassSectionExamInputData:{
//  schoolCalenderList:[],
//  examInfo:{"examTypeId", "klassSectionId", "subjectExamList"},
//  loggedUserData:{}
//}
function createKlassSectionExam(klassSectionExamInputData){

    var schoolCalenderList = klassSectionExamInputData.schoolCalenderList,
        examInfo = klassSectionExamInputData.examInfo,
        loggedUserData = klassSectionExamInputData.loggedUserData;

    var orderedSchoolCalenderData = _.sortBy(schoolCalenderList, function(schoolCalenderData) {
        return (new Date(schoolCalenderData.date)).getTime();
    });

    var klassSectionExamData = {
        'examTypeId':examInfo.examTypeId,
        'klassSectionId':examInfo.klassSectionId,
        'examStartDate':orderedSchoolCalenderData[0]._id,
        'examEndDate':orderedSchoolCalenderData[orderedSchoolCalenderData.length-1]._id
    };
    auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassSectionExamData);
    return new Promise(function (resolve, reject) {
        KlassSectionExam.create(klassSectionExamData, function(err, data){
           if(err) return  reject(err);
            return resolve(data);
        });
    });
}


function convertDatesToSchoolCalenderIds(examDates, klassSectionExamInputData) {
    return new Promise(function (resolve, reject) {
        var schoolCalenderList = [];
        async.each(examDates, function (examDate, callback) {
            SchoolCalenderModel.findByDate(examDate, function (err, calenderObj) {
                if (err)return callback(err);
                schoolCalenderList.push(calenderObj);
                callback();
            });
        }, function (err) {
            if (err) return reject(err);

            klassSectionExamInputData.schoolCalenderList = schoolCalenderList;
            resolve(schoolCalenderList);
        });
    });
}

exports.getExamList = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var requestInfo = req.body;
    ExamService.findExamList(requestInfo.klassSectionId, requestInfo.examTypeId)
        .then(handleSuccess(res))
        .catch(handleError(res))
};


function getSubjectExamListToCreate(examInfo, loggedUserData, examDateSchoolCalenderList) {
    return _.map(examInfo.subjectExamList, function (subjectExam, index) {
        var examDateCalenderId = examDateSchoolCalenderList[index]._id;
        var examData = {
            examTypeId:  mongoose.Types.ObjectId(examInfo.examTypeId),
            schoolId:  mongoose.Types.ObjectId(examInfo.schoolId),
            klassSectionSubjectId:  mongoose.Types.ObjectId(subjectExam.klassSectionSubjectId),
            klassSectionId:  mongoose.Types.ObjectId(examInfo.klassSectionId),
            duration: subjectExam.duration,
            startTime: subjectExam.startTime,
            endTime: subjectExam.endTime,
            schoolCalendarId: examDateCalenderId,
            'totalMarks':subjectExam.totalMarks //TODO..
        };
        auditManager.populateCreationAcademicAccountAudit(loggedUserData, examData);
        return examData;
    });
}