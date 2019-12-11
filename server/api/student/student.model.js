'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


/**
 * TODO..
 * SHOULD UPDATE THE 'csv_student_generator.js' IF ANY CHANGE IN ATTRIBUTE
 */

var StudentSchema = new Schema({
    name:String,
    rollNo:Number,
    admissionNo:Number,
    fatherName:String,
    motherName:String,
    bloodGroup:String,
    DOB:Date,
    gender:String, //male, female
    isRegistered:{ type: Boolean, default: true },
    parentId:{type:Schema.Types.ObjectId,ref:'Parent'},
    profilePictureUrl:String,
    isDeleted: {type:Boolean, default:false},

    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Student', StudentSchema);
