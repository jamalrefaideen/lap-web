'use strict';

var express = require('express');
var controller = require('./examtype.controller');

var router = express.Router();

router.get('/list', controller.getSchoolExamTypes);
router.post('/', controller.createSchoolExamType);

module.exports = router;
