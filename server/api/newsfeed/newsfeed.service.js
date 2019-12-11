/**
 * Created by Mathdisk on 8/29/2017.
 */


var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;

var NewsFeed = require('./newsfeed.model');
var NewsFeedLike = require('./newsfeedlike.model');


exports.createNewsFeed = createNewsFeed;
exports.getNewsFeedList = getNewsFeedList;
exports.addNewsFeedLike = addNewsFeedLike;
exports.removeNewsFeedLike = removeNewsFeedLike;
exports.getNewsFeedLikes = getNewsFeedLikes;


function createNewsFeed(data) {
    return new Promise(function (resolve, reject) {
        NewsFeed.create(data, function (err, result) {
            if (err) return reject(err);
            resolve(result)
        });

    })

}

function getNewsFeedList(schoolId) {
    var query = {
        'schoolId': schoolId
    };
    return NewsFeed.find(query)
        .sort({createdOn: -1})
        .lean().populate(["uploadedUser", "profilePictureUrl"]);
}

function addNewsFeedLike(newsFeedId, userId) {
    //check already liked
    return isNewsFeedAlreadyLikedByUser(newsFeedId, userId)
        .then(function (liked) {
            if (liked) return false;
            var data = {
                likedBy: userId,
                newsFeed: newsFeedId
            }
            return createNewsFeedLike(data);
        });
}

function createNewsFeedLike(data) {
    return new Promise(function (resolve, reject) {
        NewsFeedLike.create(data, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        });
    })
}

function removeNewsFeedLike(newsFeedId, userId) {
    return isNewsFeedAlreadyLikedByUser(newsFeedId, userId)
        .then(function (liked) {
            if (!liked) return false;
            return removeNewsFeedLike(newsFeedId, userId)
        })
}


function isNewsFeedAlreadyLikedByUser(newsFeedId, userId) {
    var query = {
        likedBy: userId,
        newsFeed: newsFeedId
    }
    //check already liked
    return NewsFeedLike.findOne(query)
        .then(function (newsFeed) {
            if (newsFeed) return true;
            return false;
        })
}


function removeNewsFeedLike(newsFeedId, userId) {
    var query = {
        likedBy: userId,
        newsFeed: newsFeedId
    }
    return new Promise(function (resolve, reject) {
        NewsFeedLike.remove(query, function (err, result) {
            if (err) return reject(err);
            resolve(result);
        });
    })
}

function getNewsFeedLikes(newsFeedIds){
    var query = {
        'newsFeed': {'$in': newsFeedIds}
    };
    return NewsFeedLike.find(query)
        .lean()
        .populate("likedBy")
        .then(buildLikedNewsFeedResult)
}


function buildLikedNewsFeedResult(allNewsFeeds){
    var result = {};
    var groupByNewsFeedId = _.groupBy(allNewsFeeds, "newsFeed");
    _.each(groupByNewsFeedId, function(newsFeedLikes, newsFeedId){
        var totalLikes = newsFeedLikes.length;
        var likedUsers = _.map(newsFeedLikes, function(newsFeedLike){
            return newsFeedLike.likedBy;
        });
        var newsFeedLikeResult = {
            totalLikes :totalLikes,
            likedUsers :likedUsers
        }
        result[newsFeedId] = newsFeedLikeResult;
    });
    return result;
}