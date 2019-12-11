'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ParentSchema = new Schema({
    userId:{type:Schema.Types.ObjectId,ref:'User'},
    secondaryUserId:{type:Schema.Types.ObjectId,ref:'User'},
    address:String,
    occupation:String,
    motherOccupation:String,

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Parent', ParentSchema);
