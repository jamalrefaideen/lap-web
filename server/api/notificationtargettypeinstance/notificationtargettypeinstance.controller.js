'use strict';
var async = require('async');
var _ = require('lodash');
var NotificationTargetTypeInstance = require('./notificationtargettypeinstance.model');
var Constant = require("../dataconstants/constants");
var mongoose = require('mongoose');

exports.getNotificationListByUserId = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var studentId = req.params.studentId;
    var query = {
        'userId': userId,
        'schoolId': loggedUserData.schoolId
    };
    if (studentId != null) {
        query.studentId = studentId;
    }
    NotificationTargetTypeInstance.find(query)
        .sort({createdOn: -1})
        .limit(20)
        .populate(['notificationInstanceId', 'notificationTargetTypeId', 'createdBy'])
        .lean()
        .exec(function (err, notificationList) {

            if (err) {
                return handleError(res, err);
            }

            var inboxNotifications = _.map(notificationList, function (notificationInst) {
                return {
                    'createdOn': new Date(notificationInst.createdOn).toDateString(),
                    'message': notificationInst.notificationInstanceId.message,
                    'notificationInstanceId': notificationInst.notificationInstanceId._id,
                    'notificationTargetTypeInstanceId': notificationInst._id,
                    'targetType': notificationInst.createdBy.name,
                    'isNotificationRead': notificationInst.isNotificationRead
                };
            });
            return res.send(200, inboxNotifications);
        })
};


exports.getStaffNotificationListByUserId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var resultObj = {
        inboxNotifications: [],
        sentNotifications: [],
        notificationTargetType: _.clone(Constant.NotificationTargetType, true)
    };

    async.series([

        function (next) {

            var inboxQuery = {
                'schoolId': loggedUserData.schoolId,
                'userId': loggedUserData.userId
            };
            NotificationTargetTypeInstance.find(inboxQuery)
                .sort({createdOn: -1})
                .limit(20)
                .populate(['notificationInstanceId', 'notificationTargetTypeId', 'createdBy'])
                .lean()
                .exec(function (err, notificationList) {

                    if (err) {
                        return next(err);
                    }

                    resultObj.inboxNotifications = _.map(notificationList, function (notificationInst) {
                        return {
                            'createdOn': new Date(notificationInst.createdOn).toDateString(),
                            'message': notificationInst.notificationInstanceId.message,
                            'notificationInstanceId': notificationInst.notificationInstanceId._id,
                            'notificationTargetTypeInstanceId': notificationInst._id,
                            'targetType': notificationInst.createdBy.name,
                            'isNotificationRead': notificationInst.isNotificationRead
                        };
                    });
                    next(err);
                })
        },

        function (next) {

            findNotificationsSentByLoggedUser(loggedUserData, function(err, sentNotifications){

                if(err) return next(err);

                resultObj.sentNotifications = sentNotifications;
                return next(err);
            });
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(resultObj);
    });
};


function findNotificationsSentByLoggedUser(loggedUserData, callback) {

    var NotificationTargetTypeConst = _.clone(Constant.NotificationTargetType, true);

    var processData = {
        'notificationInstanceIdMapper': {},
        'notificationTagrgetTypeIdMapper': {},
        'studentIdMapper': {},
        'userIdMapper': {}
    };

    async.waterfall([

            function (next) {

                var sentItemQuery = {
                    'schoolId': loggedUserData.schoolId,
                    'createdBy': loggedUserData.userId
                };
                NotificationTargetTypeInstance.find(sentItemQuery)
                    .sort({createdOn: -1})
                    .lean()
                    .exec(next)
            },

            function (notificationList, next) {

                var notificationInstanceIdList = _.map(notificationList, "notificationInstanceId");
                var NotificationInstance = mongoose.model("NotificationInstance");
                NotificationInstance.find({'_id': {$in: notificationInstanceIdList}})
                    .lean()
                    .exec(function (err, notificationInstanceList) {

                        if (err) {
                            return next(err);
                        }

                        var notificationInstanceIdMapper = {};
                        _.each(notificationInstanceList, function (notificationInstanceData) {
                            notificationInstanceIdMapper[notificationInstanceData._id] = notificationInstanceData;
                        });
                        processData.notificationInstanceIdMapper = notificationInstanceIdMapper;
                        next(err, notificationList);
                    });
            },

            function (notificationList, next) {

                var notificationTargetTypeIdList = _.map(notificationList, "notificationTargetTypeId");
                var NotificationTargetType = mongoose.model("NotificationTargetType");
                NotificationTargetType.find({'_id': {$in: notificationTargetTypeIdList}})
                    .lean()
                    .exec(function (err, notificationTargetTypeList) {

                        if (err) {
                            return next(err);
                        }

                        var notificationTagrgetTypeIdMapper = {};
                        _.each(notificationTargetTypeList, function (notificationTargetTypeData) {
                            notificationTagrgetTypeIdMapper[notificationTargetTypeData._id] = notificationTargetTypeData;
                        });
                        processData.notificationTagrgetTypeIdMapper = notificationTagrgetTypeIdMapper;
                        next(err, notificationList);
                    });
            },

            function (notificationList, next) {

                var studentIdList = _.map(notificationList, "studentId");
                var Student = mongoose.model("Student");
                Student.find({'_id': {$in: studentIdList}})
                    .lean()
                    .exec(function (err, studentList) {

                        if (err) {
                            return next(err);
                        }

                        var studentIdMapper = {};
                        _.each(studentList, function (studentData) {
                            studentIdMapper[studentData._id] = studentData;
                        });
                        processData.studentIdMapper = studentIdMapper;
                        next(err, notificationList);
                    });
            },

            function (notificationList, next) {

                var userIdList = _.map(notificationList, "userId");
                var User = mongoose.model("User");
                User.find({'_id': {$in: userIdList}})
                    .lean()
                    .exec(function (err, userList) {

                        if (err) {
                            return next(err);
                        }

                        var userIdMapper = {};
                        _.each(userList, function (userData) {
                            userIdMapper[userData._id] = userData;
                        });
                        processData.userIdMapper = userIdMapper;
                        next(err, notificationList);
                    });
            },

            function (notificationList, next) {

                var notificationInstanceIdMapper = processData.notificationInstanceIdMapper;
                var notificationTagrgetTypeIdMapper = processData.notificationTagrgetTypeIdMapper;
                var studentIdMapper = processData.studentIdMapper;
                var userIdMapper = processData.userIdMapper;

                var notificationListGroupedByInstanceId = _.groupBy(notificationList, 'notificationInstanceId');
                var notificationSentList = [];
                _.each(notificationListGroupedByInstanceId, function(groupedNotificationList, notificationInstanceId){
                    var notificationInstanceData = notificationInstanceIdMapper[notificationInstanceId];
                    var defaultNotificationData = groupedNotificationList[0];
                    var notificationTargetTypeData = notificationTagrgetTypeIdMapper[defaultNotificationData.notificationTargetTypeId];
                    if(notificationTargetTypeData.targetTypeId==NotificationTargetTypeConst.SECTION_STUDENTS.typeId){
                        notificationSentList.push({
                            'message': notificationInstanceData.message,
                            'targetType': NotificationTargetTypeConst.SECTION_STUDENTS.name,
                            'sentOn': new Date(notificationInstanceData.createdOn),
                            'createdOn': new Date(notificationInstanceData.createdOn).toDateString()
                        });
                        return true;
                    }else if(notificationTargetTypeData.targetTypeId==NotificationTargetTypeConst.SECTION_TEACHERS.typeId){
                        notificationSentList.push({
                            'message': notificationInstanceData.message,
                            'targetType': NotificationTargetTypeConst.SECTION_TEACHERS.name,
                            'sentOn': new Date(notificationInstanceData.createdOn),
                            'createdOn': new Date(notificationInstanceData.createdOn).toDateString()
                        });
                        return true;
                    }

                    var targetTypeList = [];
                    _.each(groupedNotificationList, function(notificationData){
                        if(notificationData.studentId){
                            var studentData = studentIdMapper[notificationData.studentId];
                            targetTypeList.push(studentData.name);
                        }else if(notificationData.userId){
                            var userData = userIdMapper[notificationData.userId];
                            targetTypeList.push(userData.name);
                        }
                    });
                    notificationSentList.push({
                        'message': notificationInstanceData.message,
                        'targetType': targetTypeList.join(","),
                        'sentOn': new Date(notificationInstanceData.createdOn),
                        'createdOn': new Date(notificationInstanceData.createdOn).toDateString()
                    });
                });

                var orderedNotificationSentList = _.sortBy(notificationSentList, 'sentOn');
                orderedNotificationSentList.reverse(); //we need notifications latest items...
                var orderedNotificationSentItemsList = (orderedNotificationSentList.length>20) ? orderedNotificationSentList.splice(0, 20) : orderedNotificationSentList;
                return next(null, orderedNotificationSentItemsList);
            }

        ],
        function done(err, data) {

            return callback(err, data);
        }
    );
}


exports.clearNotificationReadStatus = function (req, res) {

    var userId = req.loggedUserData.userId;
    var notificationsList = req.body.notificationsTobeCleared.map(function (notification) {
        return mongoose.Types.ObjectId(notification.notificationTargetTypeInstanceId)
    });
    var query = {
        _id: {$in: notificationsList}
    };
    NotificationTargetTypeInstance.update(query, {$set: {isNotificationRead: true}}, {multi: true}, function (err, result) {
        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send('notifications cleared');
    })
};

function handleError(res, err) {
    return res.send(500, err);
}