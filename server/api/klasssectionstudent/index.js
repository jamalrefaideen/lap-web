'use strict';

var express = require('express');
var controller = require('./klasssectionstudent.controller');

var router = express.Router();

router.post('/', controller.createKlassSectionStudent);
router.post('/bulk/add', controller.createKlassSectionStudentByBulkOperation);
router.post('/validate/import/contents', controller.findKlassSectionStudentsByImportData);
router.get('/:klassSectionId', controller.getStudentsByKlassSection);
router.get('/:klassSectionId/enrollment', controller.getEnrollmentStudentsByKlassSection);//
router.get('/enrollment/chart', controller.getPrincipalEnrollmentChartDetails);

module.exports = router;
