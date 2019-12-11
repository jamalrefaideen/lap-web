'use strict';

var express = require('express');
var controller = require("./authlocal.controller");

var router = express.Router();
router.post('/prelogin/info', controller.fetchPreLoginInfo);
router.post('/', controller.login);

module.exports = router;