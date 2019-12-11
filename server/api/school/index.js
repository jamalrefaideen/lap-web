'use strict';

var express = require('express');
var controller = require('./school.controller');

var router = express.Router();

router.post('/',controller.createSchoolDetails);
router.put('/update/:id',controller.updateSchoolDetails);

router.get('/school/details', controller.getSchoolByLoggedUser);
router.get('/', controller.getSchoolList);
router.get('/:id', controller.getSchoolById);
router.post('/attendance/detailed/info', controller.getDetailedAttendanceInfo);
router.post('/examresult/detailed/info', controller.getDetailedExamResultInfo);
router.get('/enrollment/detailed/info', controller.getDetailedSchoolEnrollmentInfo);
router.get('/enrollment/list', controller.getSchoolEnrollmentList);

module.exports = router;
