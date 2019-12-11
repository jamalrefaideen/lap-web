'use strict';


var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var NewsFeedService = require("./newsfeed.service");
var NewsFeedCommentService = require("../newsfeedcomment/newsfeedcomment.service");
var AppUtil = require("../common/app.util");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;


exports.createNewsFeed = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var userId = loggedUserData.userId;
    var newsFeed = _.pick(req.body, ["text", "mediaUrl", "uploadedDate"]);
    newsFeed.schoolId = schoolId;
    newsFeed.uploadedUser = userId;
    NewsFeedService.createNewsFeed(newsFeed)
        .then(handleSuccess(res))
        .catch(handleError(res))
};


exports.getNewsFeedList = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    NewsFeedService.getNewsFeedList(schoolId)
        .then(_.partial(buildLikeResult,loggedUserData))
        .then(_.partial(buildCommentsResult, loggedUserData))
        .then(handleSuccess(res))
        .catch(handleError(res));
};




function buildLikeResult(loggedUserData,allNewsFeeds){
    var loggedUserId = loggedUserData.userId;
    var newsFeedIds = _.map(allNewsFeeds, "_id");
    return NewsFeedService.getNewsFeedLikes(newsFeedIds)
        .then(function(allNewsFeedLikeResult){
            allNewsFeeds = _.map(allNewsFeeds, function (newsFeed) {
                var newsFeedLikeResult = allNewsFeedLikeResult[newsFeed._id];
                if(!newsFeedLikeResult){
                    newsFeed.totalLikes =0;
                    newsFeed.likedUsers =[];
                    newsFeed.isLikedByCurrentUser = false;
                    return newsFeed;
                }
                newsFeedLikeResult.isLikedByCurrentUser = _.any(newsFeedLikeResult.likedUsers, {_id: loggedUserId});
                return _.merge(newsFeed, newsFeedLikeResult);
            });
            return allNewsFeeds;
        })

}
function buildCommentsResult(loggedUserData,allNewsFeeds){
    var loggedUserId = loggedUserData.userId;
    var newsFeedIds = _.map(allNewsFeeds, "_id");
    return NewsFeedCommentService.getAllNewsFeedComments(newsFeedIds)
        .then(function(newsfeedCommentResult){
            allNewsFeeds = _.map(allNewsFeeds, function (newsFeed) {
                var newsFeedCommentResult = newsfeedCommentResult[newsFeed._id];
                if(!newsFeedCommentResult){
                    newsFeed.totalComments =0;
                    newsFeed.isCommentedByCurrentUser = false;
                    return newsFeed;
                }
                newsFeedCommentResult.isCommentedByCurrentUser = _.any(newsFeedCommentResult.newsFeedComments, {commentedUser: loggedUserId});
                return _.merge(newsFeed, newsFeedCommentResult);
            });
            return allNewsFeeds;

        });
}
exports.addNewsFeedLike = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = req.body.userId;
    var newsFeedId = req.body.newsFeedId;
    if (!userId || !newsFeedId) return handleError(res)("Invalid request");
    NewsFeedService.addNewsFeedLike(newsFeedId, userId)
        .then(function(){
            handleSuccess(res)(req.body);
        })
        .catch(handleError(res))
}


exports.removeNewsFeedLike = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = req.body.userId;
    var newsFeedId = req.body.newsFeedId;
    if (!userId || !newsFeedId) return handleError(res)("Invalid request");
    NewsFeedService.removeNewsFeedLike(newsFeedId, userId)
        .then(function(){
            handleSuccess(res)(req.body);
        })
        .catch(handleError(res))
}


