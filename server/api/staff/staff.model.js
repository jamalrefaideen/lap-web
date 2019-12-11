'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


/**
 * TODO..
 * SHOULD UPDATE THE 'csv_staff_generator.js' IF ANY CHANGE IN ATTRIBUTE
 */

var StaffSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User'},//THIS user has be one of SCHOOL_ADMIN/PRINCIPAL/STAFF userRoles
    rollNo: Number,
    address: String,
    city: String,
    DOB: Date,
    specialization:[{type: Schema.Types.ObjectId, ref: 'SubjectType'}],
    isPrincipal: Boolean,
    isSubjectTeacher: Boolean,
    isActivityTeacher: Boolean,
    isDeleted: {type:Boolean, default:false},
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: {type: Schema.Types.ObjectId, ref: 'User'}
});




module.exports = mongoose.model('Staff', StaffSchema);
