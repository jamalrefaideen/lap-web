
'use strict';

var express = require('express');
var controller = require('./notificationuser.controller.js');

var router = express.Router();

router.post('/push-token', controller.registerNotificationUser);

module.exports = router;


