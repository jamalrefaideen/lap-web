'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventTargetTypeSchema = new Schema({
    targetTypeId:Number,
    eventId: {type: Schema.Types.ObjectId, ref: 'Event'},

    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('EventTargetType',EventTargetTypeSchema);
