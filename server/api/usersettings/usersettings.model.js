'use strict';


var _ = require("lodash");
var async = require("async");

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSettingsSchema = new Schema({

    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    notificationDisabled: {type:Boolean, default:false},

    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});


module.exports = mongoose.model('UserSettings', UserSettingsSchema);
