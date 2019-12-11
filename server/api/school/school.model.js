'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SchoolSchema = new Schema({

    schoolName: String,
    schoolAddress: String,
    board: String,
    principalPhone: Number,
    phone: String,
    email: { type: String, lowercase: true },
    fax: String,
    pictureUrl: String,
    isDeleted: {type: Boolean, default: false},

    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});



module.exports = mongoose.model('School', SchoolSchema);
