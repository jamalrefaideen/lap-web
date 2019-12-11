'use strict';

var express = require('express');
var controller = require('./parent.controller');

var router = express.Router();

router.get('/dashboard/:date', controller.getDashboardDetailsByUserId);
router.get('/student/:studentId/:date', controller.getDashboardDetailsByStudent);

module.exports = router;
