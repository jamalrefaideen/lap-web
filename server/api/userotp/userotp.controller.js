/**
 * Created by Mathdisk on 8/30/2017.
 */

var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var UserModel = require("../user/user.model.js")
var AppUtil = require("../common/app.util.js");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;
var UserOtpService = require("./userotp.service")
var AuthService = require("../../auth/auth.service")

exports.sendOTP = function (req, res) {
    var mobileNumber = req.body.mobileNumber;
    if (!mobileNumber) return handleError(res)({message: "Invalid request"});
    UserModel.findOne({mobileNumber: mobileNumber})
        .then(function (user) {
            if (!user) return Promise.reject({message: "This mobile number is not available with our school"});
            if (user && user.activated) return Promise.reject({message: "This Mobile number is already activated"});
            return UserOtpService.sendOTP(user)
                .then(function (result) {
                    return {otpNumber: result}
                })
        })
        .then(handleSuccess(res))
        .catch(handleError(res))
}

exports.activateUserByOTP = function (req, res) {
    var mobileNumber = req.body.mobileNumber;
    var otpNumber = req.body.otpNumber;
    var password = req.body.newPassword;
    if (!mobileNumber || !otpNumber || !password) return handleError(res)({message: "Invalid request"});
    var getUserToken = _.partial(getUserTokenForSingleRoleUser, req.body);
    var onFindUserByOtp = _.partialRight(onFindUserByOtpSuccess, req.body);
    UserOtpService.findUserOtpByOtp(otpNumber)
        .then(onFindUserByOtp)
        .then(getUserToken)
        .then(function (token) {
            return {token: token}
        })
        .then(handleSuccess(res))
        .catch(handleError(res))
}


function onFindUserByOtpSuccess(userOtp,inputData) {
    //check valid otp
    var password = inputData.newPassword
    if (!userOtp) return Promise.reject({message: "Invalid activation code"});
    if (userOtp.activated) return Promise.reject({message: "This code is already activated"});

    //active user
    var activateUserMethod = _.partial(activateUser, userOtp.userId, password);
    userOtp.activated = true;
    return userOtp.save()
        .then(activateUserMethod)
}

function getUserTokenForSingleRoleUser(inputData, user) {
    return new Promise(function (resolve, reject) {
        AuthService.fetchLoggedUserMultiRoleInfo(inputData, user.toObject(), function (err, loggedUserMultiRoleInfo) {
            if (err) return resolve(null);


            //check  user roles
            if(loggedUserMultiRoleInfo.schoolUserRoleList.length > 1) return resolve(null);

            //generate token if user has only one role
            let tokenInputData = {//klasssectionid,activeuserRoleId,activeUserRoleName
                userId: user._id,
                klassSectionId:loggedUserMultiRoleInfo.klassSectionInfoList[0].klassSectionId,
                activeUserRoleId : loggedUserMultiRoleInfo.schoolUserRoleList[0].roleId,
                activeUserRoleName : loggedUserMultiRoleInfo.schoolUserRoleList[0].displayName
            };
            var token = AuthService.signToken(tokenInputData);
            resolve(token);
        })
    })
}


exports.validateRegisterOTP = function (req, res) {
    var otpNumber = req.body.otpNumber;
    if (!otpNumber) return handleError(res)({message: "Invalid request"});
    UserOtpService.findUserOtpByOtp(otpNumber)
        .then(function (otpInfo) {
            if (!otpInfo) return Promise.reject({message: "Invalid OTP"});
            return otpInfo;
        })
        .then(handleSuccess(res))
        .catch(handleError(res))
}

exports.validateForgotPasswordOTP = function (req, res) {
    var otpNumber = req.body.otpNumber;
    if (!otpNumber) return handleError(res)({message: "Invalid request"});
    UserOtpService.findForgotPasswordOtpByOtpNumber(otpNumber)
        .then(function (otpInfo) {
            if (!otpInfo) return Promise.reject({message: "Invalid OTP"});
            return otpInfo;
        })
        .then(handleSuccess(res))
        .catch(handleError(res))
}
exports.sendForgotPasswordOTP = function (req, res) {
    var mobileNumber = req.body.mobileNumber;
    if (!mobileNumber) return handleError(res)({message: "Invalid request"});
    UserModel.findOne({mobileNumber: mobileNumber})
        .then(function (user) {
            if (!user) return Promise.reject({message: "This Mobile number is invalid"});
            if (!user.activated) return Promise.reject({message: "This Mobile number is not activated"});
            return UserOtpService.sendForgotPasswordOTP(user)
                .then(function (result) {
                    return {otpNumber: result}
                })
        })
        .then(handleSuccess(res))
        .catch(handleError(res))
}

function activateUser(userId, password) {
    return UserModel.findById(userId)
        .then(function (user) {
            if (!user) return;
            user.activated = true;
            user.password = password;
            return user.save();
        })
}


