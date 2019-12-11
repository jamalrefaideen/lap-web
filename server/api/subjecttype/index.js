'use strict';

var express = require('express');
var controller = require('./subjecttype.controller');

var router = express.Router();

router.post('/', controller.createSchoolSubjectType);
router.put('/update', controller.updateSchoolSubject);
router.get('/list', controller.getAllSchoolSubjects);
router.get('/:schoolsubjectid/edit', controller.getSchoolSubjectObj);

module.exports = router;
