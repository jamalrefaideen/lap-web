'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StudentResultSchema = new Schema({
    examTypeId:{type:Schema.Types.ObjectId,ref:'ExamType'},
    studentId:{type:Schema.Types.ObjectId,ref:'Student'},
    klassSectionId: {type:Schema.Types.ObjectId,ref:'KlassSection'},
    totalMarks:Number, //500.. this is the sum off all subjects total marks
    marksObtained:Number, //450.. this is the sum off all subjects obtained marks
    rank:Number,
    grade:String,

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('StudentResult', StudentResultSchema);
