'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ExamSchema = new Schema({
    schoolCalendarId:{type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    examTypeId:{type:Schema.Types.ObjectId,ref:'ExamType'},
    klassSectionSubjectId:{type:Schema.Types.ObjectId,ref:'KlassSectionSubject'},
    klassSectionId:{type:Schema.Types.ObjectId,ref:'KlassSection'},
    duration:String,
    startTime:Date,
    endTime:Date,
    totalMarks:Number, //This may vary for each exam and also vary by class(10th is differ to 12th)

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Exam', ExamSchema);
