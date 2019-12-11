var express = require('express');
var controller = require('./seed-controller');

var router = express.Router();
router.get('/generate/calender', controller.generateCalendersSeed);
module.exports = router;