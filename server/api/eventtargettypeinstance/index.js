'use strict';

var express = require('express');
var controller = require('./eventtargettypeinstance.controller.js');

var router = express.Router();

router.get('/', controller.getNotificationListByUserId);
router.get('/staff', controller.getStaffNotificationListByUserId);

module.exports = router;
