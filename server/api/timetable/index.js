'use strict';

var express = require('express');
var controller = require('./timetable.controller');

var router = express.Router();

router.post('/:klassSectionId', controller.createKlassSectionTimetable);
router.get('/klass/:klassId/klassSection/:klassSectionId', controller.getWeeklyTimeTableByKlassSectionId);
router.get('/staff/:staffId', controller.getWeeklyTimeTableByStaffId);

module.exports = router;
