'use strict';

var async = require('async');
var _ = require('lodash');
var Expo = require('exponent-server-sdk');
let expo = new Expo();
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;


var auditManager = require('../../config/auditmanager');
var Diary = require('./diary.model');
var DiaryTargetInstance = require('../diarytargetinstance/diarytargetinstance.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var Parent = require('../parent/parent.model');
var NotificationUser = require('../notificationuser/notificationuser.model');
var SubjectType = require('../subjecttype/subjecttype.model');
var UserSettings = require('../usersettings/usersettings.model');


exports.createDiaryWithInstances = function (req, res) {

    var diaryData = req.body.diaryData;
    var diaryInstanceList = req.body.diaryInstances;
    var inputDate = req.params.date;
    var loggedUserData = req.loggedUserData;

    async.waterfall([

        function (next) {
            SchoolCalendar.findByDate(inputDate,next)
        },

        function (calendarObj,next) {
            diaryData.schoolCalendarId = calendarObj._id.toString();
            auditManager.populateCreationAccountAudit(loggedUserData, diaryData);
            if(diaryData.subjectTypeId) {
                diaryData.subjectTypeId = mongoose.Types.ObjectId(diaryData.subjectTypeId)
            }
            Diary.create(diaryData,next)
        },

        function (createdDiaryData,next) {

            var diaryTargetInstanceList = _.map(diaryInstanceList, function (instanceObj) {
                var diaryTargetInstanceData = {
                    'diaryId':createdDiaryData._id,
                    'studentId':mongoose.Types.ObjectId(instanceObj.studentId)
                };
                auditManager.populateCreationAccountAudit(loggedUserData, diaryTargetInstanceData);
                return diaryTargetInstanceData;
            });
            DiaryTargetInstance.create(diaryTargetInstanceList,next);
        },

        //find notification parents using list of student parent id
        function (dairyTargetInstanceData, next) {
            var parentIds = _.map(diaryInstanceList, 'parentId');
            Parent.find({_id: {'$in': parentIds}})
                .lean()
                .exec(next);
        },

        //find notification users using list of user ids
        function (parentList, next) {
            var userIdList = [];
            _.each(parentList, function(parentData){
                userIdList.push(parentData.userId);
                if(parentData.secondaryUserId){
                    userIdList.push(parentData.secondaryUserId);
                }
            });

            NotificationUser.find({userId: {'$in':userIdList}})
                .lean()
                .exec(next);
        },

        function (notificationUserList, next) {
            SubjectType.findOne({_id: diaryData.subjectTypeId})
                .lean()
                .exec(function (err, subjectTypeData) {

                    if (err) {
                        return next(err);
                    }
                    var subjectName = subjectTypeData ? subjectTypeData.subjectName : "-";
                    next(err, subjectName, notificationUserList);
                });
        },


        //filter notificationUserList by userSettings
        function (subjectName, notificationUserList, next) {

            var userIdList = _.map(notificationUserList, "userId");
            UserSettings.find({'userId': {'$in': userIdList}})
                .lean()
                .exec(function(err, userSettingsList){

                    if(err){
                        return next(err);
                    }

                    var userSettingMapper = {};
                    _.each(userSettingsList, function(userSettingsData){
                        userSettingMapper[userSettingsData.userId] = userSettingsData;
                    });

                    var notificationEnabledUserList = _.filter(notificationUserList, function(notificationUserData){
                        var userSettingsData = userSettingMapper[notificationUserData.userId];
                        if(!userSettingsData)
                            return true; //User is yet to set the settings.. default is notificationDisabled:false
                        return !userSettingsData.notificationDisabled;
                    });
                    return next(err, subjectName, notificationEnabledUserList);
                });
        },

        function (subjectName, notificationUserList, next) {

            var receiptUsers = _.map(notificationUserList, function (notificationUser) {
                return {
                    // The push token for the app user to whom you want to send the notification
                    to: notificationUser.notificationId,
                    sound: 'default',
                    body: diaryData.messageType +": "+subjectName+"-"+ diaryData.message,
                    data: {withSome: diaryData.message, notificationType : "dairy"}
                }
            });

            expo.sendPushNotificationsAsync(receiptUsers)
                .then(function (receipts) {
                    console.log(receipts);
                }).catch(function (error) {
                console.error(error);
                next(error)
            });

            next(null, receiptUsers);
        }
    ],function done(err, data) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send( 'Success');
    });
};


exports.getDiaryListByStudent = function (req, res) {

    var studentId = req.params.studentId;
    DiaryTargetInstance.find({studentId:studentId})
        .lean()
        .exec(function (err, diaryTargetInstances) {

            if (err) {
                return handleError(res, err)
            }

            var diaryIds = _.map(diaryTargetInstances,'diaryId');

            Diary.find({'_id':{$in:diaryIds}})
                .sort({createdOn:-1})
                .lean()
                .populate(['subjectTypeId','schoolCalendarId','createdBy'])
                .exec(function(err,diaryList){

                    if (err) {
                        return handleError(res, err)
                    }

                    var resultObj = _.groupBy(diaryList,'messageType');

                    return res.status(200).send(resultObj);
                })
        })
};



exports.getDiaryListByDate = function (req, res) {
    
    var loggedUserData = req.loggedUserData;

    async.waterfall([

        function(next){

            var query = {
                'schoolId':loggedUserData.schoolId,
                'studentId':req.params.studentId
            };
            DiaryTargetInstance.find(query)
                .lean()
                .exec(next);
        },

        function(diaryTargetInstanceList, next){

            var currentDate = new Date(req.params.date);
            SchoolCalendar.findByDate(currentDate,function(err,calendarObj){
                next(err, diaryTargetInstanceList, calendarObj);
            });
        },

        function(diaryTargetInstanceList,calendarObj,next){

            var schoolCalendarId = calendarObj._id;
            var diaryIdList = _.map(diaryTargetInstanceList, 'diaryId');
            var query = {
                'schoolId':loggedUserData.schoolId,
                '_id':{$in:diaryIdList},
                'schoolCalendarId':schoolCalendarId
            };
            Diary.find(query)
                .lean()
                .populate(['subjectTypeId','schoolCalendarId','createdBy'])
                .exec(function(err,diaryList){

                    if (err) {
                        return next(err);
                    }

                    var resultObj = {
                        'diary':_.map(diaryList, function(diaryData){
                            return diaryData;
                        })
                    };
                    next(err, resultObj);
                })
        }

    ],function(err, resultObj){
        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(resultObj);
    });
};


exports.getTeacherDiarySentItems = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;

    Diary.find({createdBy:userId})
        .sort({createdOn:-1})
        .lean()
        .populate(['subjectTypeId','schoolCalendarId','createdBy'])
        .exec(function(err,diarySentItems){

            if (err) {
                return handleError(res, err)
            }

            return res.status(200).send(diarySentItems);
        })
};


function handleError(res, err) {
    return res.status(500).send( err);
}
