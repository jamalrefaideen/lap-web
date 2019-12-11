'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TimetableSchema = new Schema({

    dayIndex:Number, //Ex: 1...5
    klassPeriodId:{type:Schema.Types.ObjectId,ref:'KlassPeriod'},
    klassSectionId:{type:Schema.Types.ObjectId,ref:'KlassSection'},
    klassSectionSubjectId:{type:Schema.Types.ObjectId,ref:'KlassSectionSubject'},

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Timetable', TimetableSchema);
