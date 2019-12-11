'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ResultGradeSchema = new Schema({

    gradeName:String,

    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('ResultGrade', ResultGradeSchema);
