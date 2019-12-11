'use strict';

var express = require('express');
var controller = require('./klassholiday.controller');

var router = express.Router();

router.post('/', controller.createKlassHoliday);
router.get('/list', controller.getAllKlassHolidaysBySchool);
router.get('/find/byName/:holdayName', controller.getSchoolHolidayByName);

module.exports = router;
