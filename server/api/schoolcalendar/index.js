'use strict';

var express = require('express');
var controller = require('./schoolcalendar.controller');

var router = express.Router();

router.get('/minmax', controller.getMinMaxSchoolCalendarDate);

module.exports = router;
