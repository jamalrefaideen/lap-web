'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationUserSchema = new Schema({

    notificationId:String,
    userId: {type: Schema.Types.ObjectId, ref: 'User'},

    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('NotificationUser', NotificationUserSchema);
