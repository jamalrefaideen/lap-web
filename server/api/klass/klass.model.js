'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var KlassSchema = new Schema({
    klassName:{ type: String, uppercase: true },
    klassDescription:String,
    order:Number,
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Klass', KlassSchema);
