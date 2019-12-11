'use strict';

var express = require('express');
var controller = require('./studentresult.controller');

var router = express.Router();

router.get('/new/klassSection/:klassSectionId',controller.getExamResultsWithDetailsForKlassSection);
router.get('/:studentId/:klassSectionId', controller.getExamResultsWithDetailsByStudent);
router.get('/klassSection/:klassSectionId/examType/:examTypeId', controller.getStudentResultByKlassSection);

module.exports = router;
