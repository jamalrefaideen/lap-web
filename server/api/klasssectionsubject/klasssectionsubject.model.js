'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var KlassSectionSubjectSchema = new Schema({
    displayName: String,
    klassSectionId: {type: Schema.Types.ObjectId, ref: 'KlassSection'},
    subjectTypeId: {type: Schema.Types.ObjectId, ref: 'SubjectType'},
    staffId: {type: Schema.Types.ObjectId, ref: 'Staff'},

    academicYearId: {type: Schema.Types.ObjectId, ref: 'AcademicYear'},
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('KlassSectionSubject', KlassSectionSubjectSchema);
