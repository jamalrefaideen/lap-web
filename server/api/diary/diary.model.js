'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DiarySchema = new Schema({

    message : String,
    messageType : String,
    audienceType : String,
    subjectTypeId: {type:Schema.Types.ObjectId,ref:'SubjectType'},
    schoolCalendarId : {type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    submissionDate:Date,

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Diary', DiarySchema);
