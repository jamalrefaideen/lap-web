'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LateArrivalSchema = new Schema({
    studentId:{type:Schema.Types.ObjectId,ref:'Student'},
    schoolCalendarId:{type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    klassSectionId:{type:Schema.Types.ObjectId,ref:'KlassSection'},
    lateReason:String,

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('LateArrival', LateArrivalSchema);
