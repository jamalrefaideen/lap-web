'use strict';

var express = require('express');
var passport = require('passport');
var config = require('../config/environment');
var User = require('../api/user/user.model');
var UserController = require('../api/user/user.controller');

// Passport Configuration
require('./local/passport').setup(User, config);

var router = express.Router();

router.use('/local', require('./local'));
router.get('/find/user/by/mobile', UserController.getUserObjByMobileNumber);
router.post('/reset/password', UserController.resetPassword);
router.use('/seed', require('./seed-router'));

module.exports = router;