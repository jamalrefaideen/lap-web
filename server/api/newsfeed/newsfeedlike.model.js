'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NewsFeedLikeSchema = new Schema({
    likedBy : {type:Schema.Types.ObjectId,ref:'User'},
    newsFeed:{type:Schema.Types.ObjectId,ref:'NewsFeed'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('NewsFeedLike', NewsFeedLikeSchema);
