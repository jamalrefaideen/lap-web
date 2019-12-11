'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SubjectTypeSchema = new Schema({

    subjectName: String,
    description : String,

    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('SubjectType', SubjectTypeSchema);
