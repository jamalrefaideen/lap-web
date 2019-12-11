'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var KlassPeriodSchema = new Schema({
    klassId:{type:Schema.Types.ObjectId,ref:'Klass'},
    periodIndex:Number, // Ex: 1...8
    periodType:{ type: String }, //  normal / break
    fromTime:String,
    toTime:String,

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('KlassPeriod', KlassPeriodSchema);
