'use strict';

var express = require('express');
var controller = require('./academicyear.controller');

var router = express.Router();
router.post('/', controller.createAcademicYearData);
router.put('/', controller.updateAcademicYearData);
router.get('/', controller.getAcademicYearList);
router.get('/current/data', controller.getCurrentAcademicYearData);
router.get('/edit/:academicYearId', controller.getAcademicYearDataById);
module.exports = router;
