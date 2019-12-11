'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventTargetTypeInstanceSchema = new Schema({

    eventId: {type: Schema.Types.ObjectId, ref: 'Event'},
    eventTargetTypeId: {type: Schema.Types.ObjectId, ref: 'EventTargetType'},
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    studentId: {type: Schema.Types.ObjectId, ref: 'Student'},
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

EventTargetTypeInstanceSchema.index({eventId:1, schoolId:1});
EventTargetTypeInstanceSchema.index({eventId:1, schoolId:1, studentId:1});

module.exports = mongoose.model('EventTargetTypeInstance', EventTargetTypeInstanceSchema);
