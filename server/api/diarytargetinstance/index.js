'use strict';

var express = require('express');
var controller = require('./diarytargetinstance.controller');

var router = express.Router();

router.get('/:studentId', controller.getDiaryInstancesByStudent);

module.exports = router;
