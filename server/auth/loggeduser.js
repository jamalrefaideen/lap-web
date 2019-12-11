var jwt = require('jsonwebtoken');
var config = require('../config/environment');
var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');

var User = require('../api/user/user.model.js');
var SchoolUserRole = require('../api/schooluserrole/schooluserrole.model.js');
var AcademicYear = require('../api/academicyear/academicyear.model.js');
var Constant = require("../api/dataconstants/constants");
var UserRoleTypes = Constant.UserRoleTypes;


function UnauthorizedError(code, error) {
    Error.call(this, error.message);
    this.name = "UnauthorizedError";
    this.message = error.message;
    this.code = code;
    this.status = 401;
    this.inner = error;
}

UnauthorizedError.prototype = Object.create(Error.prototype);
UnauthorizedError.prototype.constructor = UnauthorizedError;


exports.validateAuthCredentials = function (req, res, next) {

    //why parse everytime?
    var token = "";

    //check if authorization header is present
    if (req.headers && !req.headers.authorization) {
        var authErr = new UnauthorizedError('credentials_required', {message: 'No Authorization header was found'});
        return next(authErr);
    }

    //now parse the headers
    if (req.headers && req.headers.authorization) {
        var parts = req.headers.authorization.split(' ');
        if (parts.length == 2) {
            var scheme = parts[0];
            var credentials = parts[1];

            //use the regular expression to check  if the headerValue starts with "Bearer"
            if (/^Bearer$/i.test(scheme)) {
                token = credentials;
            }

        } else {
            var authErr = new UnauthorizedError('credentials_bad_format', {message: 'Format is Authorization: Bearer [token]'});
            return next(authErr);
        }
    }

    var secretKey = config.secrets.session;

    //This method decocdes the token
    //decoded:{userId,activeUserRoleId,activeUserRoleName,klassSectionId} //here klassSectionId is optional
    var options = {};
    jwt.verify(token, secretKey, options, function (err, decoded) {

        if (err) {
            var authErr = new UnauthorizedError('credentials_required', {message: 'Invalid Authorization header was found'});
            return next(authErr);
        }

        getFindUserIdFunc(decoded, function(err, loggedUserData){

            if(err) return next(err);

            req.loggedUserData = loggedUserData;
            return next();
        });
    });
};


//decoded:{userId, activeUserRoleId, activeUserRoleName, klassSectionId} //here klassSectionId is optional
function getFindUserIdFunc(decoded, callback) {

    var loggedUserData = {
        'klassSectionId': decoded.klassSectionId,
        'roleId': decoded.activeUserRoleId,
        'roleName': decoded.activeUserRoleName
    };

    async.series([

        function (next) {

            User.findOne({'_id': decoded.userId})
                .lean()
                .exec(function (err, userData) {
                    if (err || !userData) {
                        return callback(new Error('Invalid User'));
                    }

                    loggedUserData.userId = userData._id;
                    loggedUserData.schoolId = userData.schoolId;
                    loggedUserData.isLapAdmin = userData.isLapAdmin;
                    return next(err);
                });
        },

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'isCurrent': true
            };
            AcademicYear.findOne(query)
                .lean()
                .populate(["fromDate", "toDate"])
                .exec(function (err, academicYearData) {
                    if (err) return next(err);
                    loggedUserData.academicYearData = academicYearData;
                    return next();
                });
        },

        function (next) {
            var query = {
                'schoolId': loggedUserData.schoolId,
                'roleId': UserRoleTypes.PRINCIPAL.roleId
            };
            SchoolUserRole.findOne(query)
                .lean()
                .exec(function (err, principalRole) {
                    if (err) return next(err);
                    if (!principalRole) return next();
                    loggedUserData.schoolPrincipalUserId = principalRole.userId;
                    return next();
                });
        }


    ], function done(err) {

        return callback(err, loggedUserData);
    });
}

