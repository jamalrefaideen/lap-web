'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AcademicYearSchema = new Schema({

    fromDate : {type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    toDate : {type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    isCurrent : Boolean,

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
