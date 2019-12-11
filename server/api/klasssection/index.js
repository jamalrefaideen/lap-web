'use strict';

var express = require('express');
var controller = require('./klasssection.controller');

var router = express.Router();

router.post('/:klassId', controller.createKlassSectionByKlass);
router.put('/update/:klassSectionId', controller.updateKlassSection);
router.get('/:klassId', controller.getKlassSectionsByKlass);
router.get('/detail/:klassSectionId', controller.getKlassSectionDetailsById);
router.get('/:klassId/klasssectionlist', controller.getKlassSectionList);
router.get('/:klassSectionId/enrollment/list', controller.getKlassSectionEnrollmentList);//Web Principal View
router.get('/:klassSectionId/enrollment/detailed/list', controller.getKlassSectionDetailedEnrollmentList);//Mobile Principal View



module.exports = router;
