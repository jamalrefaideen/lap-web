'use strict';

var async = require("async");
var auditManager = require('../../config/auditmanager');

var User = require('../../api/user/user.model');
var School = require("../../api/school/school.model");
//var AccountSettings = require("../../api/accountsettings/accountsettings.model");

var CONSTANTS = require('../../api/dataconstants/constants');
var UserRoleTypesConst = CONSTANTS.UserRoleTypes;

setupSampleUsers();


//this method will create rootAdmin only if database dont have any rootAdmin account....
function setupSampleUsers() {
    School.find()
        .lean()
        .count(function (err, schoolCount) {

            if (!err && schoolCount == 0) {

                createSampleAccount();
            }
        });
}


function createSampleAccount() {

    async.waterfall([

        function (next) {
            var schoolData = {
                schoolName: "KDVP School of Education",
                schoolAddress: "Chennai India",
                board: "CBSE",
                principalPhone: 789456123,
                phone: 123456789,
                email: 'admin@kdvp.com',
                fax: '111-22222'
            };
            School.create(schoolData, function (err, data) {

                if(err){return next(err)}

                var schoolId = data._id;
                next(err, schoolId);
            });
        },

        function (schoolId, next) {

            User.create({
                provider: 'local',
                roleId: UserRoleTypesConst.SCHOOL_ADMIN.roleId,
                name: 'School Admin',
                schoolId: schoolId,
                email: 'schooladmin@kdvp.com',
                mobileNumber: 11111,
                password: 'lap123',
                activated: true
            },function(err,data){

                if(err){return next(err)}

                next(err,schoolId)

            });
        },

        function (schoolId, next) {

            User.create({
                provider: 'local',
                roleId: UserRoleTypesConst.PRINCIPAL.roleId,
                name: 'Principal',
                schoolId: schoolId,
                email: 'principal@kdvp.com',
                mobileNumber: 22222,
                password: 'lap123',
                activated: true
            },function(err,data){

                if(err){return next(err)}

                next(err,schoolId)

            });
        },

        function (schoolId, next) {

            User.create({
                provider: 'local',
                roleId: UserRoleTypesConst.STAFF.roleId,
                name: 'Staff',
                schoolId: schoolId,
                email: 'staff@kdvp.com',
                mobileNumber: 33333,
                password: 'lap123',
                activated: true
            },function(err,data){

                if(err){return next(err)}

                next(err,schoolId)

            });
        },

        function (schoolId, next) {

            User.create({
                provider: 'local',
                roleId: UserRoleTypesConst.PARENT.roleId,
                role: UserRoleTypesConst.PARENT.name,
                name: 'Parent',
                schoolId: schoolId,
                email: 'parent@kdvp.com',
                mobileNumber: 44444,
                password: 'lap123',
                activated: true
            }, next);
        }

    ], function done(err) {

        if (err) console.error("Error occurred while creating  account/user sample seed data");
        else console.log("Successfully created account/user sample seed data");
    });
}


