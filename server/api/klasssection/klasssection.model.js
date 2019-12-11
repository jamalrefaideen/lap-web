'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var KlassSectionSchema = new Schema({

    sectionName:{ type: String, uppercase: true },
    klassSectionName:{ type: String, uppercase: true },
    klassId:{type:Schema.Types.ObjectId,ref:'Klass'},
    staffId:{type:Schema.Types.ObjectId,ref:'Staff'},//klassTeacher
    isAcademic:Boolean,

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('KlassSection', KlassSectionSchema);
