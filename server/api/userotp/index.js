'use strict';

var express = require('express');
var UserOTPController = require('./userotp.controller');
var router = express.Router();
router.post('/send', UserOTPController.sendOTP);//send  otp  to register
router.post('/validate/register', UserOTPController.validateRegisterOTP);
router.post('/activate/user', UserOTPController.activateUserByOTP);
router.post('/send/forgotpassword', UserOTPController.sendForgotPasswordOTP);
router.post('/validate/forgotpassword', UserOTPController.validateForgotPasswordOTP);
module.exports = router;