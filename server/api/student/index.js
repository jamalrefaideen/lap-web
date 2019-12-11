'use strict';

var express = require('express');
var controller = require('./student.controller');

var router = express.Router();

router.post('/delete/:studentId', controller.updateStudentDelete);
router.get('/:studentId/edit', controller.getStudentObj);
router.put('/update', controller.updateEditStudentDetails);
router.put('/update/parent/setting/mobile', controller.updateParentSettingDetails);
router.get('/list/byParent', controller.getStudentsByParent);
router.get('/:gender/byGender', controller.getStudentListByGender);
router.get('/klass/:klassId/klassSection/:klassSectionId', controller.getSectionStudentList);
router.get('/klass/:klassId/search', controller.getKlassStudentList);
router.get('/klass/:klassId/klassSection/:klassSectionId/byRollNumber/:rollNumber', controller.getStudentByRollNumber);
router.get('/byAdmissionNumber/:admissionNumber', controller.getStudentByAdmissionNumber);
router.get('/:studentId/enrollment/data', controller.getStudentEnrollmentData);

module.exports = router;
