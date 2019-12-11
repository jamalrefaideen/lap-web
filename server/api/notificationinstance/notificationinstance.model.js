'use strict';

var mongoose = require('mongoose');
var async = require("async");
var _ = require("lodash");
var moment = require("moment");

var Schema = mongoose.Schema;

var NotificationInstanceSchema = new Schema({
    message:String,
    date:Date,

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});


//inputData: {loggedUserData, currentDate}
NotificationInstanceSchema.statics.findNotificationByDate = function (inputData, callback) {

    var loggedUserData = inputData.loggedUserData;
    var currentDate = inputData.currentDate;
    var NotificationTargetType = mongoose.model('NotificationTargetType');
    var NotificationTargetTypeInstance = mongoose.model('NotificationTargetTypeInstance');
    var NotificationInstance = mongoose.model('NotificationInstance');

    async.waterfall([

        function (next) {

            var today = moment(currentDate)
                .toDate();
            today.setHours(0, 0, 5);
            var tomorrow = moment(currentDate).add(1, 'days')
                .toDate();
            tomorrow.setHours(0, 0, 5);
            var notificationQuery = {
                'date': {
                    $gte: today,
                    $lt: tomorrow
                },
                'schoolId': mongoose.Types.ObjectId(loggedUserData.schoolId)
            };
            NotificationInstance.find(notificationQuery)
                .populate("createdBy")
                .lean()
                .exec(next);
        },

        function (notificationList, next) {

            var notificationIdList = _.map(notificationList, "_id");
            var notificationQuery = {
                'userId': mongoose.Types.ObjectId(loggedUserData.userId),
                'notificationInstanceId': {$in: notificationIdList},
                'schoolId': mongoose.Types.ObjectId(loggedUserData.schoolId)
            };

            NotificationTargetTypeInstance.find(notificationQuery)
                .lean()
                .exec(function (err, notificationTargetInstanceList) {

                    return next(err, notificationList, notificationTargetInstanceList);
                });
        },

        function (notificationList, notificationTargetInstanceList, next) {

            var notificationIdMapper = {};
            _.each(notificationList, function (notificationData) {
                notificationIdMapper[notificationData._id] = notificationData;
            });

            var matchedNotificationList = _.map(notificationTargetInstanceList, function (notificationTargetInstanceData) {
                var notificationData = notificationIdMapper[notificationTargetInstanceData.notificationInstanceId];
                return notificationData;
            });
            return next(null, matchedNotificationList);
        }

    ], function done(err, notificationList) {

        return callback(err, notificationList);
    });
};



module.exports = mongoose.model('NotificationInstance',NotificationInstanceSchema);
