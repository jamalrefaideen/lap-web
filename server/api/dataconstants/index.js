'use strict';

var express = require('express');
var controller = require('./constants.controller.js');

var router = express.Router();

router.get('/userroles',controller.getUserRoleTypes);
router.get('/messagetypes',controller.getDiaryMessageTypes);
router.get('/notiification/targettypes',controller.getNotificationTargetTypes);
router.get('/principal/notiification/targettypes',controller.getPrincipalNotificationTargetTypes);
router.get('/event/targettypes',controller.getEventTargetTypes);
router.get('/principal/event/targettypes',controller.getPrincipalEventTargetTypes);

module.exports = router;
