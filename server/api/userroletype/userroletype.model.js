'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserRoleTypeSchema = new Schema({
    roleId:Number,
    code:String,
    name:String,
    launchUrl:String,
    feature:String,

    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});


module.exports = mongoose.model('UserRoleType', UserRoleTypeSchema);