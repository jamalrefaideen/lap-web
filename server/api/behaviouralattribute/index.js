'use strict';

var express = require('express');
var controller = require('./behaviouralattribute.controller');

var router = express.Router();

router.post('/', controller.createBehaviourAttribute);
router.put('/update', controller.updateBehaviourAttribute);
router.get('/', controller.getBehaviourAttributesAndScore);
router.get('/behaviourAttributesList', controller.getBehaviourAttributes);
router.get('/edit/:behaviourAttributeId', controller.getBehaviourAttributeById);
router.post('/find/students/behaviours', controller.fetchStudentsBehaviourInfo);
router.get('/learningtrait/:behaviouralAttributeId', controller.getKlassSectionLearningTraitsByBehaviourId);//

module.exports = router;
