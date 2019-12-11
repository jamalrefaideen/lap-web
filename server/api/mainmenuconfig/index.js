'use strict';

var express = require('express');
var controller = require('../mainmenuconfig/mainmenuconfig.controller');

var router = express.Router();

router.get('/', controller.getMainMenus);

module.exports = router;
