/**
 * Created by rizwan on 8/31/2017.
 */

var async = require("async");
var _ = require("lodash");
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

var UserSettings = require('./usersettings.model');
var auditManager = require('../../config/auditmanager');


exports.saveLoggedUserSettings = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;

    var query = {'userId': loggedUserData.userId};
    UserSettings.findOne(query)
        .lean()
        .exec(function (err, loggedUserSettingsdata) {

            if (err) {
                return handleError(res, err);
            }

            if(!loggedUserSettingsdata){
                return createLoggedUserSettings(inputData, loggedUserData, onSuccessCallback);
            }

            return updateLoggedUserSettings(inputData, loggedUserData, onSuccessCallback);
        });

    function onSuccessCallback(err, data){
        if (err) {
            return handleError(res, err);
        }
        return res.send(200, 'UserSettings saved successfully!');
    }
};


// updateData: {'notificationDisabled':true/false}
function updateLoggedUserSettings(updateData, loggedUserData, callback) {
    var query = {'userId': loggedUserData.userId};
    auditManager.populateUpdateAudit(loggedUserData, updateData);
    UserSettings.update(query, {$set: updateData}, callback);
}




// inputData: {'notificationDisabled':true/false}
function createLoggedUserSettings(inputData, loggedUserData, callback) {
    inputData.userId =  loggedUserData.userId;
    auditManager.populateCreationAudit(loggedUserData, inputData);
    UserSettings.create(inputData, callback);
}


exports.getLoggedUserSettings = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var query = {'userId': loggedUserData.userId};
    UserSettings.findOne(query)
        .lean()
        .exec(function (err, loggedUserSettingsdata) {

            if (err) {
                return handleError(res, err);
            }

            return res.send(200, loggedUserSettingsdata);
        });
};


function handleError(res, err) {
    return res.status(500).send(err);
}
