'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DiaryTargetInstanceSchema = new Schema({

    diaryId : {type:Schema.Types.ObjectId,ref:'Diary'},
    studentId : {type:Schema.Types.ObjectId,ref:'Student'},

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('DiaryTargetInstance', DiaryTargetInstanceSchema);
