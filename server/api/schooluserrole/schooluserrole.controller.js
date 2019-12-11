'use strict';

var SchoolUserRole = require('./schooluserrole.model');
var mongoose = require('mongoose');
var Promise = require('bluebird');
var Constants = require('../dataconstants/constants');
// set Promise provider to bluebird
mongoose.Promise = Promise;
var _ = require("lodash");

exports.getSchoolAdminByCount = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolAdminUserRole = Constants.UserRoleTypes.SCHOOL_ADMIN.roleId;
    var schoolAdminRoleCount = {};

    var query = {
        schoolId: loggedUserData.schoolId,
        roleId: schoolAdminUserRole
    };

    SchoolUserRole.find(query)
        .count()
        .lean()
        .exec(function (err, schoolAdminByCount) {

            if (err) {
                return handleError(res, err);
            }
            schoolAdminRoleCount.count = schoolAdminByCount;

            return res.json(200, schoolAdminRoleCount);
        });
};
exports.getSchoolUserRolesList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schooId = loggedUserData.schoolId;

    var query = {
        schoolId:schooId
    };

    SchoolUserRole.find(query)
        .sort("roleId")
        .lean()
        .exec(function (err, UserRolesList) {

            if (err) {
                return handleError(res, err);
            }
            return res.json(200, UserRolesList);
        });
};

exports.getStaffRoleByUserId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var userId = req.params.userId;
    var query = {
        'schoolId': schoolId,
        'userId': userId
    }

    SchoolUserRole.find(query)
        .lean()
        .exec(function (err, staffDataRoleList) {

            if (err) {
                return handleError(res, err);
            }

            var roleIdNameMapper = {}, staffRoleList = [];
            _.each(Constants.UserRoleTypes, function (userRoleTypeData) {
                roleIdNameMapper[userRoleTypeData.roleId] = userRoleTypeData.name;
            });
            staffRoleList = _.map(staffDataRoleList, function (staffRoleData) {
                staffRoleData.roleName = roleIdNameMapper[staffRoleData.roleId];
                return staffRoleData;
            });
            return res.json(200, staffRoleList);
        });
};


function handleError(res, err) {
    return res.status(500).send(err);
}