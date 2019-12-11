'use strict';

var express = require('express');
var controller = require('./user.controller');
var config = require('../../config/environment');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/', controller.create);
router.post('/update/settings/teacher', controller.updateTeacherSettings);
router.post('/update/settings/parent', controller.updateParentSettings);

router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.put('/update', controller.updateUserProfileData);
router.get('/me', auth.isAuthenticated(), controller.me);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.get('/findby/email', controller.getUserObjByEmail);
router.get('/findby/mobile', controller.getUserObjByMobileNumber);
router.get('/findby/mobile/details', controller.getUserDetailsByMobileNumber);
router.post('/logout', controller.logout);
module.exports = router;
