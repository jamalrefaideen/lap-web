'use strict';

var express = require('express');
var controller = require('./behaviouralscore.controller');

var router = express.Router();

router.post('/', controller.saveBehaviourScore);
router.get('/behaviourScoreList', controller.getBehaviourScores);

module.exports = router;
