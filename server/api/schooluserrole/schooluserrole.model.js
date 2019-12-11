'use strict';

var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var auditManager = require("../../config/auditmanager");

var SchoolUserRoleSchema = new Schema({

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    userId:{type:Schema.Types.ObjectId,ref:'User'},
    roleId:Number,

    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});



SchoolUserRoleSchema.statics.removeDependents = function (inputData, callback) {

    var roleId = inputData.roleId,
        userId = mongoose.Types.ObjectId(inputData.userId),
        loggedUserData = inputData.loggedUserData;

    var SchoolUserRoleModel = mongoose.model('SchoolUserRole');
    var User = mongoose.model('User');

    async.waterfall([

        function(next){

            var removeQuery = {
                'roleId':roleId,
                'userId':userId,
                'schoolId':loggedUserData.schoolId
            };
            SchoolUserRoleModel.remove(removeQuery, function(err, data){
                return next(err);
            });
        },

        function(next){

            var query = {
                'userId':userId,
                'schoolId':loggedUserData.schoolId
            };
            SchoolUserRoleModel.count(query, function(err, userRoleCount){
                return next(err, {'count':userRoleCount});
            });
        },

        function( userRoleCountData, next){

            if(userRoleCountData.count!=0){
                return next();
            }

            var query = {
                '_id':userId,
                'schoolId':loggedUserData.schoolId
            };
            var updateData = {'isDeleted': true};
            auditManager.populateUpdateAudit(loggedUserData, updateData);
            User.update(query, {$set:updateData}, function(err, data){
                return next(err);
            });
        }

    ], callback);
};


module.exports = mongoose.model('SchoolUserRole', SchoolUserRoleSchema);
