'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ChatRoomSchema = new Schema({

    userId : {type:Schema.Types.ObjectId,ref:'User'},
    name : String,
    roomId : {type:Schema.Types.ObjectId}, //either classSectionId or schoolId

    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
