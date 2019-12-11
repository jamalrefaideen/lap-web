'use strict';

var express = require('express');
var controller = require('./studentmark.controller');

var router = express.Router();

router.post('/examType/:examTypeId/klassSection/:klassSectionId', controller.storeBulkStudentMarksByKlassSection);

router.get('/klassSection/:klassSectionId/examType/:examTypeId', controller.getStudentMarksByKlassSection);
router.post('/klassSection/:klassSectionId/examType/:examTypeId', controller.storeKlassSectionStudentMarks);
router.post('/student/:studentId/examType/:examTypeId', controller.storeStudentMarks);

module.exports = router;
