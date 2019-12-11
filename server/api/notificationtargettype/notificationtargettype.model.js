'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationTargetTypeSchema = new Schema({
    targetTypeId:Number,
    notificationInstanceId: {type: Schema.Types.ObjectId, ref: 'NotificationInstance'},
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('NotificationTargetType',NotificationTargetTypeSchema);
