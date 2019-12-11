'use strict';

var express = require('express');
var controller = require('./klasssectionsubject.controller');

var router = express.Router();

router.post('/:klassSectionId', controller.saveklassSectionSubject);
router.put('/update/:klassSectionSubjectId', controller.updateKlassSectionSubject);
router.get('/klassSection/:klassSectionId', controller.getKlassSectionSubjectList);
router.get('/edit/:klassSectionSubjectId', controller.getKlassSectionSubjectById);
module.exports = router;
