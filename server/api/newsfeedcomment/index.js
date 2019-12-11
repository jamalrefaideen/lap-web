'use strict';

var express = require('express');
var controller = require('./newsfeedcomment.controller');

var router = express.Router();


router.post('/create', controller.createNewsFeedComment);
router.get('/list/:newsFeedId', controller.getNewsFeedCommentList);

module.exports = router;
