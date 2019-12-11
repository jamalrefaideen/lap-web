var express = require('express');
var controller = require('./usersettings.controller');

var router = express.Router();

router.post('/', controller.saveLoggedUserSettings);
router.get('/loggeduser/settings', controller.getLoggedUserSettings);

module.exports = router;
