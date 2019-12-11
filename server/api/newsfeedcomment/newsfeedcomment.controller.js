'use strict';


var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var NewsFeedCommentService = require("./newsfeedcomment.service");
var AppUtil = require("../common/app.util");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;


exports.createNewsFeedComment = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var newsFeedId = req.body.newsFeedId;
    var comment = req.body.comment;
    if (!newsFeedId || !comment) return handleError(res)("Invalid Request");
    NewsFeedCommentService.createNewsFeedComment(newsFeedId, comment, userId)
        .then(handleSuccess(res))
        .catch(handleError(res))
};


exports.getNewsFeedCommentList = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var loggedUserId = req.loggedUserData.userId;
    var newsFeedId = req.params.newsFeedId;
    var allNewsFeeds = [];
    NewsFeedCommentService.getNewsFeedComments(newsFeedId)
        .then(handleSuccess(res))
        .catch(handleError(res));
};