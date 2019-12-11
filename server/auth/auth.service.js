'use strict';

var mongoose = require('mongoose');
var _ = require("lodash");
var async = require('async');
var config = require('../config/environment');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var compose = require('composable-middleware');
var User = require('../api/user/user.model');
var SchoolUserRole = require('../api/schooluserrole/schooluserrole.model');
var AcademicYear = require('../api/academicyear/academicyear.model');
var CONSTANTS = require('../api/dataconstants/constants');
var Staff = require('../api/staff/staff.model');
var KlassSectionSubject = require('../api/klasssectionsubject/klasssectionsubject.model');
var KlassSection = require('../api/klasssection/klasssection.model');
var validateJwt = expressJwt({secret: config.secrets.session});

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
function isAuthenticated() {
    return compose()
        // Validate jwt
        .use(function (req, res, next) {
            // allow access_token to be passed through query parameter as well
            if (req.query && req.query.hasOwnProperty('access_token')) {
                req.headers.authorization = 'Bearer ' + req.query.access_token;
            }
            validateJwt(req, res, next);
        })
        // Attach user to request
        .use(function (req, res, next) {
            var decodedData = req.user;
            User.findById(decodedData.userId, function (err, user) {
                if (err) return next(err);
                if (!user) return res.status(401).send('Unauthorized');

                req.user = user;
                next();
            });
        });
}

/**
 * tokenInputData:{userId,klassSectionId} //here klassSectionId is optional
 * Returns a jwt token signed by the app secret
 */
function signToken(tokenInputData) {
    return jwt.sign(tokenInputData, config.secrets.session, {expiresInMinutes: 24 * 60 * 365});
}


function fetchLoggedUserMultiRoleInfo(inputData, userData, callback) {

    var loggedUserData = {
        'mobileNumber':inputData.mobileNumber,
        'password':inputData.password,
        'userId':userData._id,
        'schoolId':userData.schoolId,
        'email':userData.email,
        'isLapAdmin':userData.isLapAdmin,
        'isSchoolAdmin':false,
        'isPrincipal':false,
        'isStaff':false,
        'isParent':false,
        'schoolUserRoleList':[],
        'klassSectionInfoList':[] //{'klassSectionId','klassSectionName', 'subjectNameList', 'isKlassTeacher', 'isStaffTeacher'},
    };

    async.waterfall([

        function (next) {

            var query = {
                'schoolId':loggedUserData.schoolId,
                'userId':loggedUserData.userId
            };
            SchoolUserRole.find(query)
                .lean()
                .exec(next);
        },

        function(schoolUserRoleList, next){

            var userRoleIdMapper = {};
            var UserRoleTypes = CONSTANTS.UserRoleTypes;
            userRoleIdMapper[""+UserRoleTypes.LAP_ADMIN.roleId] = {'propName':'isLapAdmin', 'name':'LAP_ADMIN'};
            userRoleIdMapper[""+UserRoleTypes.SCHOOL_ADMIN.roleId] = {'propName':'isSchoolAdmin', 'name':'SCHOOL_ADMIN'};
            userRoleIdMapper[""+UserRoleTypes.PRINCIPAL.roleId] = {'propName':'isPrincipal', 'name':'PRINCIPAL'};
            userRoleIdMapper[""+UserRoleTypes.STAFF.roleId] = {'propName':'isStaff', 'name':'STAFF'};
            userRoleIdMapper[""+UserRoleTypes.PARENT.roleId] = {'propName':'isParent', 'name':'PARENT'};

            _.each(schoolUserRoleList, function(schoolUserRoleData){
                var userRoleMappedData = userRoleIdMapper[schoolUserRoleData.roleId];
                loggedUserData[userRoleMappedData.propName] = true;
                schoolUserRoleData.displayName = userRoleMappedData.name;
            });

            loggedUserData.schoolUserRoleList = schoolUserRoleList;
            return next();
        },

        function(next){

            loggedUserData.klassSectionInfoList = [];
            if(!loggedUserData.isStaff){
                return next();
            }

            var query = {
                'isCurrent': true,
                'schoolId': loggedUserData.schoolId
            };
            AcademicYear.findOne(query)
                .lean()
                .exec(function(err, academicYearData){
                    if(err) return next(err);
                    return getKlassSectionInfoList(loggedUserData, academicYearData, next);
                });
        }

    ], function(err){

        return callback(err, loggedUserData);
    });
}


//output --> {
//    'klassSectionInfoList':[
//         {'klassSectionId','klassSectionName', 'subjectNameList', 'isKlassTeacher', 'isStaffTeacher'},
//         {}, ..
//        ]
//     }
function getKlassSectionInfoList(loggedUserData, academicYearData, callback) {

    async.waterfall([

        function (next) {

            var query = {
                'userId': loggedUserData.userId,
                'schoolId': loggedUserData.schoolId
            };
            Staff.findOne(query)
                .lean()
                .exec(next);
        },


        function (staffData, next) {

            var query = {
                'staffId': staffData._id,
                'academicYearId': academicYearData._id
            };
            KlassSectionSubject.find(query)
                .populate(["klassSectionId", "subjectTypeId"])
                .lean()
                .exec(function (err, klassSectionSubjectList) {
                    return next(err, staffData, klassSectionSubjectList);
                });
        },

        function (staffData, klassSectionSubjectList, next) {
            var query = {'staffId': staffData._id};
            KlassSection.findOne(query)
                .lean()
                .exec(function (err, ownKlassSection) {
                    return next(err, klassSectionSubjectList, ownKlassSection);
                });
        },

        function (klassSectionSubjectList, ownKlassSection, next) {
            var klassSectionIdToInfoMapper = {};
            if (ownKlassSection) {
                klassSectionIdToInfoMapper[ownKlassSection._id] = {
                    'klassSectionId': ownKlassSection._id,
                    'klassSectionName': ownKlassSection.klassSectionName,
                    'subjectNameList': [],
                    'isKlassTeacher': true,
                    'isStaffTeacher': false
                };
            }
            _.each(klassSectionSubjectList, function (klassSectionSubjectData) {
                var klassSectionData = klassSectionSubjectData.klassSectionId;//populated field
                var subjectTypeData = klassSectionSubjectData.subjectTypeId;//populated field
                var subjectKlassSectionId = klassSectionData._id;
                var loggedUserKlassSectionInfo = klassSectionIdToInfoMapper[subjectKlassSectionId] || {
                        'klassSectionId': subjectKlassSectionId,
                        'klassSectionName': klassSectionData.klassSectionName,
                        'subjectNameList': [],
                        'isKlassTeacher': false,
                        'isStaffTeacher': true
                    };
                loggedUserKlassSectionInfo.subjectNameList.push(subjectTypeData.subjectName);
                klassSectionIdToInfoMapper[subjectKlassSectionId] = loggedUserKlassSectionInfo;
            });
            var loggedUserKlassSectionInfoList = _.values(klassSectionIdToInfoMapper);
            loggedUserKlassSectionInfoList = _.map(loggedUserKlassSectionInfoList, function (sectionInfo) {
                sectionInfo.sectionDisplayName = sectionInfo.klassSectionName;
                if (sectionInfo.isKlassTeacher)sectionInfo.sectionDisplayName = sectionInfo.klassSectionName + " - Class Teacher";
                return sectionInfo;
            })
            loggedUserData.klassSectionInfoList = loggedUserKlassSectionInfoList;
            return next();
        }

    ], callback);
}






exports.fetchLoggedUserMultiRoleInfo = fetchLoggedUserMultiRoleInfo;
exports.isAuthenticated = isAuthenticated;
exports.signToken = signToken;
