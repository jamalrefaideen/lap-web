'use strict';

var express = require('express');
var controller = require('./notificationinstance.controller');

var router = express.Router();

router.post('/send', controller.sendNotification);

module.exports = router;
