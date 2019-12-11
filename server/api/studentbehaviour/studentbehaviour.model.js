'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StudentBehaviourSchema = new Schema({

    klassSectionStudentId: {type: Schema.Types.ObjectId, ref: 'KlassSectionStudent'},
    klassSectionId: {type: Schema.Types.ObjectId, ref: 'KlassSection'},
    behaviouralScoreId: {type: Schema.Types.ObjectId, ref: 'BehaviouralScore'},
    behaviouralAttributeId: {type: Schema.Types.ObjectId, ref: 'BehaviouralAttribute'},
    schoolCalendarId: {type: Schema.Types.ObjectId, ref: 'schoolCalendar'},
    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('StudentBehaviour', StudentBehaviourSchema);
