'use strict';

var express = require('express');
var controller = require('./event.controller');

var router = express.Router();

router.post('/create/event', controller.createEvent);
router.put('/update/:eventId', controller.updateEventById);
router.get('/fetch/:monthIndex/:year', controller.fetchEventByMonthIndex);
router.get('/fetch/parent/:monthIndex/:year/:studentId', controller.fetchEventByMonthIndex);//get parent events

module.exports = router;
