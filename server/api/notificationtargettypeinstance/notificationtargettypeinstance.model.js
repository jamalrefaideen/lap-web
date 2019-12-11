'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationTargetTypeInstanceSchema = new Schema({
    notificationInstanceId: {type: Schema.Types.ObjectId, ref: 'NotificationInstance'},
    notificationTargetTypeId: {type: Schema.Types.ObjectId, ref: 'NotificationTargetType'},
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    studentId: {type: Schema.Types.ObjectId, ref: 'Student'},// when  notification send to parent,  should save the student id
    isNotificationRead:{type:Boolean,default:false},
    
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('NotificationTargetTypeInstance', NotificationTargetTypeInstanceSchema);
