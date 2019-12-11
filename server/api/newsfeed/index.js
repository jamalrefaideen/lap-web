'use strict';

var express = require('express');
var controller = require('./newsfeed.controller');

var router = express.Router();

router.post('/create/feed', controller.createNewsFeed);
router.get('/list', controller.getNewsFeedList);
router.post('/add/like', controller.addNewsFeedLike);
router.post('/remove/like', controller.removeNewsFeedLike);

module.exports = router;
