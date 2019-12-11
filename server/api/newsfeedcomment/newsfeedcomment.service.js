

var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var NewsFeedComment = require('./newsfeedcomment.model');

exports.createNewsFeedComment = createNewsFeedComment;
exports.getNewsFeedComments = getNewsFeedComments;
exports.getAllNewsFeedComments = getAllNewsFeedComments;


function createNewsFeedComment(newsFeedId, comment, commentedBy){
    var data = {
        newsFeedId : newsFeedId,
        comment : comment,
        commentedUser : commentedBy
    }
    return new Promise(function (resolve, reject) {
        NewsFeedComment.create(data, function (err, result) {
            if (err) return reject(err);

            NewsFeedComment.populate(result, "commentedUser", function(err,  commentResult){
                if (err) return reject(err);
                resolve(commentResult)
            });
        });
    })
}



function getNewsFeedComments(newsFeedId) {
    var query = {
        'newsFeedId': newsFeedId
    };
    return NewsFeedComment.find(query)
        .sort({createdOn: -1})
        .lean().populate("commentedUser");
}



function getAllNewsFeedComments(newsFeedIds){
    var query = {
        'newsFeedId': {'$in': newsFeedIds}
    };
    return NewsFeedComment.find(query)
        .lean()
        .then(buildNewsFeedCommentResult)
}


function buildNewsFeedCommentResult(allNewsFeedsComments){
    var result = {};
    var groupByNewsFeedId = _.groupBy(allNewsFeedsComments, "newsFeedId");
    _.each(groupByNewsFeedId, function(newsFeedComments, newsFeedId){
        var totalComments= newsFeedComments.length;
        var newsFeedCommentResult = {
            totalComments :totalComments,
            newsFeedComments :newsFeedComments
        }
        result[newsFeedId] = newsFeedCommentResult;
    });
    return result;
}