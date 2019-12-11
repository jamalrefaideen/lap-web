'use strict';
var async = require('async');
var _ = require('lodash');
var NotificationTargetTypeInstance = require('./eventtargettypeinstance.model.js');


exports.getNotificationListByUserId = function(req,res){
  var loggedUserData = req.loggedUserData;
  var userId = loggedUserData.userId;

  NotificationTargetTypeInstance.find({ userId: userId})
      .populate(['notificationInstanceId','notificationTargetTypeId','createdBy'])
      .lean()
      .exec(function(err,notificationList){

          if(err){
              return handleError(res,err);
          }

          return res.send(200,notificationList);
      })
};


exports.getStaffNotificationListByUserId = function(req,res){
    
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var resultObj = {inboxNotifications:[],sentNotifications:[]};
    
    async.series([

        function (next) {
            NotificationTargetTypeInstance.find({ userId: userId})
                .populate(['notificationInstanceId','notificationTargetTypeId','createdBy'])
                .lean()
                .exec(function(err,notificationList){

                    if(err){
                        return next(err);
                    }
                    
                    resultObj.inboxNotifications = notificationList;
                    next(err);
                })
        },

        function (next) {
            NotificationTargetTypeInstance.find({createdBy: userId})
                .populate(['notificationInstanceId','notificationTargetTypeId','createdBy'])
                .lean()
                .exec(function(err,notificationList){

                    if(err){
                        return next(err);
                    }

                    resultObj.sentNotifications = notificationList;
                    next(err);
                })
        }
        
    ], function done(err, data) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, resultObj);

    });
};

function handleError(res, err) {
    return res.send(500, err);
}