'use strict';
var async = require('async');
var _ = require('lodash');
var Promise = require('bluebird');
// set Promise provider to bluebird
require('mongoose').Promise = require('bluebird');

var Expo = require('exponent-server-sdk');
var expo = new Expo();

var Constant = require("../dataconstants/constants");
var NotificationInstance = require('./notificationinstance.model');
var NotificationTargetType = require('../notificationtargettype/notificationtargettype.model');
var NotificationTargetTypeInstance = require('../notificationtargettypeinstance/notificationtargettypeinstance.model');
var Parent = require('../parent/parent.model');
var StudentModel = require('../student/student.model');
var NotificationUser = require('../notificationuser/notificationuser.model');
var UserSettings = require('../usersettings/usersettings.model');
var auditManager = require('../../config/auditmanager');


//inputData: {message, targetTypeId, userList:[]}
//userList: Can be either sectionStudentList or sectionTeacherList
exports.sendNotification = function (req, res) {

    var loggedUserData = req.loggedUserData;

    var inputData = req.body;
    var message = inputData.message;
    var targetTypeId = inputData.targetTypeId;
    var userList = inputData.userList;

    async.waterfall([

            function (next) {

                var notificationInstanceInputData = {
                    message: message,
                    date: new Date()
                };
                auditManager.populateCreationAccountAudit(loggedUserData, notificationInstanceInputData);
                NotificationInstance.create(notificationInstanceInputData, next);
            },

            function (notificationInstanceData, next) {

                var notificationTargetTypeInputData = {
                    targetTypeId: targetTypeId,
                    notificationInstanceId: notificationInstanceData._id
                };
                auditManager.populateCreationAccountAudit(loggedUserData, notificationTargetTypeInputData);
                NotificationTargetType.create(notificationTargetTypeInputData, next)
            },

            //find notification parents/staffs using inputUserList and targetTypeId
            function (notificationTargetTypeInstanceData, next) {
                findNotificationTargetUserList(targetTypeId, userList, loggedUserData)
                    .then(function (notificationUserList) {
                        return next(null, notificationTargetTypeInstanceData, notificationUserList)
                    })
                    .catch(next);
            },

            function (notificationTargetTypeInstanceData, notificationUserList, next) {

                var uniqueNotificationTargetUserList = _.uniq(notificationUserList, function (notificationUser) {
                    if (notificationUser.studentId) return notificationUser.userId && notificationUser.studentId;
                    return notificationUser.userId;
                });

                var notificationTargetTypeInstances = _.map(uniqueNotificationTargetUserList, function (uniqueNotificationTargetUser) {
                    var instanceObj = {
                        notificationInstanceId: notificationTargetTypeInstanceData.notificationInstanceId,
                        notificationTargetTypeId: notificationTargetTypeInstanceData._id,
                        userId: uniqueNotificationTargetUser.userId,
                        studentId: uniqueNotificationTargetUser.studentId
                    };
                    auditManager.populateCreationAccountAudit(loggedUserData, instanceObj);
                    return instanceObj;
                });

                NotificationTargetTypeInstance.create(notificationTargetTypeInstances, function (err, notificationTargetTypeInstance) {
                    return next(err, uniqueNotificationTargetUserList);
                });
            },

            //filter notificationUserList by userSettings and notificationUser and push the message
            function (notificationUserList, next) {

                pushNotification(message, notificationUserList, next);
            }
        ],

        function done(err, data) {

            if (err) {
                return handleError(res, err)
            }

            return res.status(200).send('success');
        });

};


//userList: Can be either studentList or staffList
//Here include principal if targetType is either ALL_STUDENTS and ALL_TEACHERS
function findNotificationTargetUserList(targetTypeId, userList, loggedUserData) {

    var NotificationTargetType = _.clone(Constant.NotificationTargetType);
    var studentNotificationTypeIds = [NotificationTargetType.SECTION_STUDENTS.typeId, NotificationTargetType.SELECTED_SECTION_STUDENTS.typeId];
    if (studentNotificationTypeIds.indexOf(targetTypeId) != -1) {
        return findNotificationTargetUsersByStudentList(targetTypeId, userList, loggedUserData);
    }

    return new Promise(function (resolve, reject) {
        var notificationUserList = _.map(userList, function (staffUserData) {
            return {'userId': staffUserData.userId};
        });
        // is target type is all teacher
        if (loggedUserData.userId!=loggedUserData.schoolPrincipalUserId && targetTypeId == NotificationTargetType.SECTION_TEACHERS.typeId) {
            notificationUserList.push({'userId':loggedUserData.schoolPrincipalUserId});
        }
        return resolve(notificationUserList);
    });
}


function findNotificationTargetUsersByStudentList(targetTypeId, studentList, loggedUserData) {

    return new Promise(function (resolve, reject) {

            var NotificationTargetType = _.clone(Constant.NotificationTargetType);
            if (NotificationTargetType.SELECTED_SECTION_STUDENTS.typeId == targetTypeId) { // SELECTED_STUDENTS

                var parentIdList = _.map(studentList, 'parentId');
                var query = {
                    'schoolId': loggedUserData.schoolId,
                    '_id': {'$in': parentIdList}
                };
                Parent.find(query)
                    .lean()
                    .exec(function (err, parentList) {

                        if (err) return reject(err);

                        var studentTargetUserList = constructStudenrTargetUserList(parentList, studentList);
                        return resolve(studentTargetUserList);
                    });

            } else { // ALL_STUDENTS

                async.waterfall([

                    function (next) {

                        var query = {'schoolId': loggedUserData.schoolId};
                        StudentModel.find(query)
                            .lean()
                            .exec(function (err, docs) {

                                if (err) return next(err);

                                var allStudentList = _.map(docs, function (student) {
                                    student.studentId = student._id.toString();
                                    return student;
                                });
                                next(null, allStudentList);
                            });
                    },


                    function (allStudentList, next) {

                        var query = {
                            'schoolId': loggedUserData.schoolId
                        };
                        Parent.find(query)
                            .lean()
                            .exec(function (err, parentList) {
                                return next(err, allStudentList, parentList)
                            });
                    }

                ], function done(err, allStudentList, parentList) {

                    if (err) return reject(err);

                    var studentTargetUserList = constructStudenrTargetUserList(parentList, allStudentList);
                    return resolve(studentTargetUserList);
                });

            }
        }
    );
}



function constructStudenrTargetUserList(parentList, studentList) {

    var parentIdMapper = {};
    _.each(parentList, function (parentData) {
        parentIdMapper[parentData._id] = parentData;
    });

    var studentTargetUserList = [];
    _.each(studentList, function (student) {
        var parentData = parentIdMapper[student.parentId];
        studentTargetUserList.push({ //primaryParentNotificationInstData
            'userId': parentData.userId.toString(),
            'studentId': student.studentId
        });

        if(parentData.secondaryUserId){
            studentTargetUserList.push({ //secondaryParentNotificationInstData
                'userId': parentData.secondaryUserId.toString(),
                'studentId': student.studentId
            });
        }
    });

    return studentTargetUserList;
}


function pushNotification(message, notificationTargetUserList, callback) {

    async.waterfall([

        //find notification users using list of user ids
        function (next) {
            var userIds = _.map(notificationTargetUserList, 'userId');
            NotificationUser.find({userId: {'$in': userIds}})
                .lean()
                .exec(function (err, notificationUserList) {

                    if (err) return next(err);

                    var uniqNotificationUserList = _.uniq(notificationUserList, function (notificationUserData) {
                        return notificationUserData.userId.toString() && notificationUserData.notificationId;
                    });
                    return next(null, uniqNotificationUserList);
                });
        },


        //filter notificationUserList by userSettings
        function (notificationUserList, next) {

            var userIdList = _.map(notificationUserList, "userId");
            UserSettings.find({'userId': {'$in': userIdList}})
                .lean()
                .exec(function (err, userSettingsList) {

                    if (err) {
                        return next(err);
                    }

                    var userSettingMapper = {};
                    _.each(userSettingsList, function (userSettingsData) {
                        userSettingMapper[userSettingsData.userId] = userSettingsData;
                    });

                    var notificationEnabledUserList = _.filter(notificationUserList, function (notificationUserData) {
                        var userSettingsData = userSettingMapper[notificationUserData.userId];
                        if (!userSettingsData)
                            return true; //User is yet to set the settings.. default is notificationDisabled:false
                        return !userSettingsData.notificationDisabled;
                    });
                    return next(err, notificationEnabledUserList);
                });
        },

        function (notificationUserList, next) {

            if(notificationUserList.length==0) return next(null, []);
            
            var receiptUsers = _.map(notificationUserList, function (notificationUser) {
                return {
                    // The push token for the app user to whom you want to send the notification
                    to: notificationUser.notificationId,
                    sound: 'default',
                    body: message,
                    data: {withSome: message}
                }
            });

            expo.sendPushNotificationsAsync(receiptUsers)
                .then(function (receipts) {
                    console.log(receipts);
                }).catch(function (error) {
                console.error("PushNotification Err: "+error);
            });
            next(null, receiptUsers);

        }], function done(err, data) {

        return callback(err, data);
    });
}


function handleError(res, err) {
    return res.send(500, err);
}