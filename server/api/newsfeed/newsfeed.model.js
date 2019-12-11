'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NewsFeedSchema = new Schema({
    text : String,
    mediaUrl : String,
    uploadedUser : {type:Schema.Types.ObjectId,ref:'User'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('NewsFeed', NewsFeedSchema);
