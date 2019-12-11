'use strict';

var async = require("async");
var ChatRoom = require('./chatroom.model');



function handleError(res, err) {
    return res.send(500, err);
}
