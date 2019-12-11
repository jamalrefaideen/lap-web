'use strict';

var express = require('express');
var controller = require('./studentattendance.controller');

var router = express.Router();

router.get('/:studentId', controller.getAttendanceDetailsByStudent);
router.post('/', controller.saveStudentAttendance);

module.exports = router;
