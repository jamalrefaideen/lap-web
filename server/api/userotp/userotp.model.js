'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserOTPSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    mobileNumber: Number,
    otpNumber: Number,
    activated : {type: Boolean, default: false},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date
});


module.exports = mongoose.model('UserOTP', UserOTPSchema);
