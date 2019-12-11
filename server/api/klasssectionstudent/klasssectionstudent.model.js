'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var KlassSectionStudentSchema = new Schema({
    klassId : {type:Schema.Types.ObjectId,ref:'Klass'},
    klassSectionId: {type:Schema.Types.ObjectId,ref:'KlassSection'},
    studentId: {type:Schema.Types.ObjectId,ref:'Student'},
    isDeleted: {type:Boolean, default:false},

    academicYearId: {type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('KlassSectionStudent', KlassSectionStudentSchema);
