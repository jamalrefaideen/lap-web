var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var UserModel = require("../user/user.model.js")
var UserOtpModel = require("../userotp/userotp.model");
var ForgotPasswordOtpModel = require("../userotp/forgotpasswordotp.model")
var SMS_Service = require("../common/sms.service")


exports.sendOTP = sendOTP;
exports.sendForgotPasswordOTP = sendForgotPasswordOTP;
exports.findUserOtpByOtp = findUserOtpByOtp;
exports.findForgotPasswordOtpByOtpNumber = findForgotPasswordOtpByOtpNumber;
exports.findForgotPasswordOtpByMobileNumber = findForgotPasswordOtpByMobileNumber;


function sendOTP(user) {
   return  UserOtpModel.findOne({userId: user._id, activated: false})
        .lean()
        .then(function (userOtpModel) {
            if (userOtpModel) {
                return SMS_Service.sendOTPSMS(user.mobileNumber, userOtpModel.otpNumber);
            }
            return SMS_Service.sendNewOTPSMS(user.mobileNumber)
                .then(function (newOTPNumber) {
                    return createUserOtp(user._id, user.mobileNumber, newOTPNumber)
                })
        })
}



function sendForgotPasswordOTP(user) {
    return  ForgotPasswordOtpModel.findOne({userId: user._id, activated: false})
        .lean()
        .then(function (userOtpModel) {
            if (userOtpModel) {
                return SMS_Service.sendForgotPasswordOTPSMS(user.mobileNumber, userOtpModel.otpNumber);
            }
            return SMS_Service.sendNewForgotPasswordOTPSMS(user.mobileNumber)
                .then(function (newOTPNumber) {
                    return createForgotPasswordOtp(user._id, user.mobileNumber, newOTPNumber)
                })
        })
}


function createUserOtp(userId, mobileNumber, otpNumber) {
    var data = {
        userId: userId,
        mobileNumber: mobileNumber,
        otpNumber: otpNumber
    }
    return new Promise(function (resolve, reject) {
        UserOtpModel.create(data, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        })
    });
}
function createForgotPasswordOtp(userId, mobileNumber, otpNumber) {
    var data = {
        userId: userId,
        mobileNumber: mobileNumber,
        otpNumber: otpNumber
    }
    return new Promise(function (resolve, reject) {
        ForgotPasswordOtpModel.create(data, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        })
    });
}

function findUserOtpByOtp(otpNumber){
    return UserOtpModel.findOne({otpNumber : otpNumber, activated : false})
}
function findForgotPasswordOtpByOtpNumber(otpNumber){
    return ForgotPasswordOtpModel.findOne({otpNumber : otpNumber,activated : false})
}
function findForgotPasswordOtpByMobileNumber(mobileNumber){
    return ForgotPasswordOtpModel.findOne({mobileNumber : mobileNumber, activated : false})
}