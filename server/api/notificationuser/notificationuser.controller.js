'use strict';
var async = require('async');
var NotificationUser = require('./notificationuser.model.js');
var auditManager = require('../../config/auditmanager');


exports.registerNotificationUser = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var notificationId = req.body.notificationToken;


    async.waterfall([

        function (next) {
            var removeQuery = {
                userId: userId,
                notificationId: notificationId
            };
            NotificationUser.remove(removeQuery,function (err) {
                return next(err);
            });
        },

        function (next) {

            var dbData = {
                userId: userId,
                notificationId: notificationId
            };
            auditManager.populateCreationAudit(loggedUserData, dbData);
            NotificationUser.create(dbData, next);

        }],function done(err, data) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, {message:'success'});

    });


};

function handleError(res, err) {
    return res.send(500, err);
}