'use strict';

var express = require('express');
var controller = require('./principal.controller');

var router = express.Router();

router.get('/learning/traits/info', controller.getPrincipalLearningTraitsInfo);

module.exports = router;
