'use strict';

var express = require('express');
var controller = require('./diary.controller');

var router = express.Router();

router.post('/:date', controller.createDiaryWithInstances);
router.get('/:studentId', controller.getDiaryListByStudent);
router.get('/teacher/sentitems', controller.getTeacherDiarySentItems);
router.get('/:studentId/:date', controller.getDiaryListByDate);

module.exports = router;
