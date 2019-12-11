'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ExamTypeSchema = new Schema({
    name:String,
    description:String,

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('ExamType', ExamTypeSchema);
