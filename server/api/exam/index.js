'use strict';

var express = require('express');
var controller = require('./exam.controller');

var router = express.Router();


router.post('/create', controller.createExamsToClassSection);
router.post('/section/list', controller.getExamList);


module.exports = router;
