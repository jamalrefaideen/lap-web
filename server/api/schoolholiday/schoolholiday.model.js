'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SchoolHolidaySchema = new Schema({
    schoolCalendarId:{type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    holidayName: String,
    holidayDescription: String,

    academicYearId : {type: Schema.Types.ObjectId, ref: 'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('SchoolHoliday', SchoolHolidaySchema);
