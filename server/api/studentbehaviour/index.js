'use strict';

var express = require('express');
var controller = require('./studentbehaviour.controller');

var router = express.Router();

router.get('/:klassSectionStudentId', controller.getBehaviourDetailsByKlassSectionStudent);
router.get('/chart/:klassSectionStudentId', controller.getBehaviourChartDetailsByStudent);
router.get('/principalchart/school', controller.getBehaviourChartDetailsBySchool);
router.post('/', controller.saveStudentBehaviourDetails);

module.exports = router;
