/**
 * Created by Mathdisk on 8/18/2017.
 */
var _ = require("lodash");
var OtpNumberGenerator = require("./otp.generator")
var TwilioApi = require("./twilio.api")
var Promise = require('bluebird');


exports.sendNewOTPSMS = sendNewOTPSMS;
exports.sendOTPSMS = sendOTPSMS;
exports.sendNewForgotPasswordOTPSMS = sendNewForgotPasswordOTPSMS;
exports.sendForgotPasswordOTPSMS = sendForgotPasswordOTPSMS;


function sendNewOTPSMS(mobileNumber) {
    var otpNumber = OtpNumberGenerator.generate();
    var msg = "LetzLap Activation Code is " + otpNumber;
     return TwilioApi.sendSMS(mobileNumber, msg)
         .then(function(){
             return otpNumber;
         })
}
function sendOTPSMS(mobileNumber,otpNumber) {
    var msg = "LetzLap Activation Code is  " + otpNumber;
    return TwilioApi.sendSMS(mobileNumber, msg)
        .then(function(){
            return otpNumber;
        })
}


function sendNewForgotPasswordOTPSMS(mobileNumber) {
    var otpNumber = OtpNumberGenerator.generate();
    var msg = "LetzLap Forgot Password Activation Code is " + otpNumber;
    return TwilioApi.sendSMS(mobileNumber, msg)
        .then(function(){
            return otpNumber;
        })
}
function sendForgotPasswordOTPSMS(mobileNumber,otpNumber) {
    var msg = "LetzLap Forgot Password Activation Code is  " + otpNumber;
    return TwilioApi.sendSMS(mobileNumber, msg)
        .then(function(){
            return otpNumber;
        })
}