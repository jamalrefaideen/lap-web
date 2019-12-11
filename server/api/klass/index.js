'use strict';

var express = require('express');
var controller = require('./klass.controller');

var router = express.Router();

router.post('/', controller.createKlassBySchool);
router.put('/', controller.updateKlassObj);
router.put('/order', controller.updateKlassOrder);
router.get('/list', controller.getKlassList);
router.get('/:klassId', controller.getKlassDetailsById);

module.exports = router;
