'use strict';

var express = require('express');
var controller = require('./constants.controller.js');

var router = express.Router();

router.get('/userroles',controller.getUserRoleTypes);

module.exports = router;
