'use strict';

var express = require('express');
var controller = require('./notificationtargettypeinstance.controller');

var router = express.Router();

router.get('/', controller.getNotificationListByUserId);
router.get('/parent/:studentId', controller.getNotificationListByUserId);
router.get('/staff', controller.getStaffNotificationListByUserId);
router.post('/clear/read', controller.clearNotificationReadStatus);

module.exports = router;
