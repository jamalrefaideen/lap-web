'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StudentMarkSchema = new Schema({
    examId:{type:Schema.Types.ObjectId,ref:'Exam'},
    klassSectionSubjectId:{type:Schema.Types.ObjectId,ref:'KlassSectionSubject'},
    studentId:{type:Schema.Types.ObjectId,ref:'Student'},
    resultType: String,
    resultGradeId:{type:Schema.Types.ObjectId,ref:'ResultGrade'},
    marks:Number,

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('StudentMark', StudentMarkSchema);
