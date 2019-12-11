'use strict';
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var async = require('async');
var passport = require('passport');
var _ = require("lodash");

var config = require('../../config/environment');
var auditManager = require('../../config/auditmanager');
var User = require('./user.model');
var Staff = require('../staff/staff.model');
var Student = require('../student/student.model');
var Parent = require('../parent/parent.model');
var constants = require('../dataconstants/constants');
var UserOptService = require("../userotp/userotp.service");
var validationError = function (res, err) {
    return res.status(422).json(err);
};


/**
 * Creates a new user
 */
exports.create = function (req, res, next) {
    var newUser = new User(req.body);
    newUser.provider = 'local';
    newUser.role = 'user';
    newUser.save(function (err, user) {
        if (err) return validationError(res, err);
        var token = jwt.sign({_id: user._id}, config.secrets.session, {expiresInMinutes: 60 * 5});
        res.json({token: token});
    });
};

/**
 * Get a single user
 */
exports.show = function (req, res, next) {
    var userId = req.params.id;

    User.findById(userId, function (err, user) {
        if (err) return next(err);
        if (!user) return res.status(401).send('Unauthorized');
        res.json(user.profile);
    });
};

/**
 * Change a users password
 */
exports.changePassword = function (req, res, next) {
    var userId = req.user._id;
    var oldPass = String(req.body.oldPassword);
    var newPass = String(req.body.newPassword);

    User.findById(userId, function (err, user) {
        if (user.authenticate(oldPass)) {
            user.password = newPass;
            user.save(function (err) {
                if (err) return validationError(res, err);
                res.status(200).send('OK');
            });
        } else {
            res.status(403).send('Forbidden');
        }
    });
};


exports.resetPassword = function (req, res) {
    var mobileNumber = req.body.mobileNumber;
    var otpNumber = req.body.otpNumber;
    var newPass = String(req.body.newPassword);
    var query = {mobileNumber: mobileNumber};
    UserOptService.findForgotPasswordOtpByMobileNumber(mobileNumber)
        .then(function (userOtp) {
            if (!userOtp || userOtp.otpNumber != otpNumber)return res.status(500).send({message: "Invalid Activation code!"});
            resetPasswordByUserId(userOtp.userId, newPass)
                .then(function () {
                    userOtp.activated = true;
                    return userOtp.save();
                })
                .then(function () {
                    res.status(200).send("Success");
                })
                .catch(function (err) {
                    console.error(err);
                    res.status(500).send({message: "Error while reset password"});
                })
        })
        .catch(function (err) {
            console.error(err);
            res.status(500).send({message: "Error while reset password"});
        })
};

function resetPasswordByUserId(userId, newPassword) {
    return new Promise(function (resolve, reject) {
        User.findById(userId)
            .then(function (user) {
                user.password = newPassword;
                user.save(function (err) {
                    if (err) return reject(err);
                    resolve("Success")
                })
            })
            .catch(function (err) {
                if (err) return reject(err);
            })
    })
}

function deactivateForgotPasswordOtp(mobileNumber) {
    return new Promise(function (resolve, reject) {
        UserOptService.findForgotPasswordOtpByMobileNumber(mobileNumber)
            .then(function (doc) {
                doc.activated = true
                doc.save(function (err) {
                    if (err) return reject(err)
                    resolve()
                })
            })
            .catch(function (err) {
                reject(err)
            })

    })

}
/**
 * Get my info
 */
exports.me = function (req, res, next) {
    var userId = req.user._id;
    var loggedUserData = req.loggedUserData;
    var query = {'_id': userId};
    User.findOne(query, '-salt -hashedPassword')
        .lean()
        .exec(function (err, user) { // don't ever give out the password or salt
            if (err) return next(err);
            if (!user) return res.status(401).send('Unauthorized');
            getUserProfileInfo(user, loggedUserData, function (err, profileInfo) {
                if (err) return next(err);
                user.profile = profileInfo;
                res.json(user);
            });
        });
};

function getUserProfileInfo(user, loggedUserData, callback) {
    user.isStaff = false;
    user.isParent = false;
    var roleId = loggedUserData.roleId;
    if (roleId == constants.UserRoleTypes.STAFF.roleId ) {
        return Staff.findOne({userId: user._id})
            .populate('specialization')
            .lean()
            .exec(function (err, staffInfo) {
                if (err) return callback(err);
                user.isStaff = true;
                return callback(err, staffInfo);
            });
    } else if (roleId == constants.UserRoleTypes.PARENT.roleId) {
        var query = {$or:[{'userId':user._id}, {'secondaryUserId':user._id}]};
        return Parent.findOne(query)
            .lean()
            .exec(function (err, parentInfo) {
                if (err) return callback(err);
                user.isParent = true;
                return callback(err, parentInfo);
            });
    }
    else if(roleId == constants.UserRoleTypes.PRINCIPAL.roleId){
        return Staff.findOne({userId: user._id})
            .populate('specialization')
            .lean()
            .exec(function (err, staffInfo) {
                if (err) return callback(err);
                user.isStaff = false;
                return callback(err, staffInfo);
            });

    }
    return callback(null, {})
}


// get user by email for unique validation
exports.getUserObjByEmail = function (req, res) {

    var query = {
        'email': req.query.email,
        'isDeleted':false
    };
    User.findOne(query, function (err, data) {

        if (err) {
            return res.status(500).send(err);
        }

        return res.send(201, data);
    });
};

// get user by mobile Number for unique validation
exports.getUserObjByMobileNumber = function (req, res) {
    var query = {
        'mobileNumber': req.query.mobileNumber,
        'isDeleted':false
    };
    User.findOne(query, function (err, data) {

        if (err) {
            return res.status(500).send(err);
        }

        return res.send(201, data);
    });
};

// get user with parent/staff details by mobile Number for unique validation
exports.getUserDetailsByMobileNumber = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var resultData = {
        'hasExistInOtherAccount': false,
        'userDetails': {},
        'parentDetails': {},
        'staffDetails': {},
        'isStaff': false,
        'isParent': false
    };

    var query = {
        'mobileNumber': req.query.mobileNumber,
        'isDeleted':false
    };
    User.findOne(query)
        .lean()
        .exec(function (err, data) {

            if (err) {
                return res.status(500).send(err);
            }
            if (!data) {
                return res.send(201, data);
            }

            resultData.userDetails = data;
            if (loggedUserData.schoolId.toString() != data.schoolId.toString()) {
                resultData.hasExistInOtherAccount = true;
                return res.send(201, resultData);
            }

            fetchUserParentStaffDetails(loggedUserData, resultData, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
                return res.send(201, resultData);
            });
        });
};

function fetchUserParentStaffDetails(loggedUserData, resultObj, callback) {

    async.series([

        function (next) {
            var matchedUserId = resultObj.userDetails._id;
            var query = {
                'schoolId':loggedUserData.schoolId,
                $or:[{'userId':matchedUserId}, {'secondaryUserId':matchedUserId}]
            };
            Parent.findOne(query)
                .populate(['userId','secondaryUserId'])
                .lean()
                .exec(function (err, parentData) {
                    if (err || !parentData) {
                        return next(err);
                    }

                    resultObj.parentDetails = parentData;
                    resultObj.isParent = true;
                    next();
                });
        },

        function (next) {
            var query = {
                'schoolId':loggedUserData.schoolId,
                'userId':resultObj.userDetails._id
            };
            Staff.findOne(query)
                .lean()
                .exec(function (err, staffData) {
                    if (err || !staffData) {
                        return next(err);
                    }

                    resultObj.staffDetails = staffData;
                    resultObj.isStaff = true;
                    next();
                });
        }

    ], callback);
}


//inputData:{
// userData:{email,name,profilePictureUrl},
// staffData:{city,address}
// }
exports.updateTeacherSettings = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var inputData = req.body;
    var userData = inputData.userData;
    var staffData = inputData.staffData;

    async.series([

        function (next) {

            var userUpdateData = {
                email: userData.email,
                name: userData.name,
                profilePictureUrl: userData.profilePictureUrl
            };
            auditManager.populateUpdateAudit(loggedUserData, userUpdateData);
            User.update({_id: userId}, {$set: userUpdateData}, next);
        },

        function (next) {

            var staffUpdateData = {
                city: staffData.city,
                address: staffData.address
            };
            auditManager.populateUpdateAudit(loggedUserData, staffUpdateData);
            Staff.update({userId: userId}, {$set: staffUpdateData}, next);
        }

    ], function done(err) {

        if (err) {
            return res.status(500).send(err);
        }

        var updatedData = {
            email: userData.email,
            name: userData.name,
            profilePictureUrl: userData.profilePictureUrl,
            profile:{
                city: staffData.city,
                address:staffData.address
            }
        };
        return res.send(200, updatedData);
    });
};


//inputData:{
// userData:{email,name,profilePictureUrl},
// studentData:{studentName,name,motherName,bloodgroup,dob,studentId},
// parentData : {address,occupation,motherOccupation}
// }
exports.updateParentSettings = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var inputData = req.body;
    var userData = inputData.userData;
    var studentData = inputData.studentData;
    var parentData = inputData.parentData;
    var studentId = mongoose.Types.ObjectId(studentData.studentId);
    var isLoggedAsFather=false, isLoggedAsMother=false;

    async.series([

        function (next) {

            var query = {
                $or:[{'userId':userId}, {'secondaryUserId':userId}]
            };
            Parent.findOne(query)
                .lean()
                .exec(function(err, parantData){
                   if(err) return next(err);

                    if(userId.toString()==parantData.userId.toString()){
                        isLoggedAsFather = true;
                        return next();
                    }else if(parantData.secondaryUserId && userId.toString()==parantData.secondaryUserId.toString()){
                        isLoggedAsMother = true;
                        return next();
                    }
                });
        },

        function (next) {

            //Logged user can be either father/mother
            var userData = {
                email: userData.email,
                name: userData.name,
                profilePictureUrl: userData.profilePictureUrl
            };
            auditManager.populateUpdateAudit(loggedUserData, userData);
            User.update({_id:userId}, {$set: userData}, next);
        },

        function (next) {

            var studentDBData = {
                name: studentData.studentName,
                fatherName: studentData.name,
                motherName: studentData.motherName,
                bloodGroup: studentData.bloodgroup,
                dob: studentData.dob
            };
            auditManager.populateUpdateAudit(loggedUserData, studentDBData);
            Student.update({_id: studentId}, {$set: studentDBData}, next);
        },

        function(next){

            var parentDbData = {
                address: parentData.address,
                occupation: parentData.occupation,
                motherOccupation: parentData.motherOccupation
            };

            var query = isLoggedAsFather ? {'userId':userId} : {'secondaryUserId':userId};
            auditManager.populateUpdateAudit(loggedUserData, parentDbData);
            Parent.update(query, {$set: parentDbData}, next);
        },

        function(next){

            var parantData = {};
            if(userId.toString()==parantData.userId.toString()){
                isLoggedAsFather = true;
                return next();
            }else if(parantData.secondaryUserId && userId.toString()==parantData.secondaryUserId.toString()){
                isLoggedAsMother = true;
                return next();
            }
        }

    ], function done(err) {

        if (err) {
            return res.status(500).send(err);
        }

        var updatedData = {
            email: userData.email,
            name: userData.name,
            mobileNumber: userData.mobileNumber,
            profilePictureUrl: userData.profilePictureUrl,
            studentName: studentData.studentName,
            motherName: studentData.motherName,
            motherNumber: studentData.motherNumber,
            bloodgroup: studentData.bloodgroup,
            dob: studentData.dob,
            profile: {
                address: parentData.address,
                occupation: parentData.occupation,
                motherOccupation: parentData.motherOccupation
            }
        };
        return res.send(200, updatedData);
    });
};


exports.updateUserProfileData = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var inputData = req.body;
    auditManager.populateUpdateAudit(loggedUserData, inputData);

    User.update({_id: userId}, {$set: inputData}, function (err, result) {
        if (err) {
            return res.status(500).send(err);
        }

        return res.send(200, "Success");
    });
};


exports.logout = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var inputData = req.body; // {'notificationId':xxx}

    var query = {
        'userId': userId,
        'notificationId': inputData.notificationId
    };
    var NotificationUser = mongoose.model('NotificationUser');
    NotificationUser.remove(query, function (err) {

        if (err) {
            return res.status(500).send(err);
        }

        return res.send(200, "Success");
    });
};


/**
 * Authentication callback
 */
exports.authCallback = function (req, res, next) {
    res.redirect('/');
};
