'use strict';

var express = require('express');
var controller = require('./klassperiod.controller');

var router = express.Router();

router.post('/create', controller.createClassPeriod);
router.post('/update/klass/:klassId', controller.updateKlassPeriodList);
router.post('/fetch/details', controller.fetchPeriodDetailsByKlass);
router.get('/klass/:klassId', controller.getKlassPeriodList);
router.get('/period/createdklass', controller.getPeriodCreatedKlassIds);
module.exports = router;
