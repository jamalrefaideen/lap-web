var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var AppUtil = require("../common/app.util");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;
var firebaseConfig = require("./firebase.config");

exports.getFireBaseConfig = getFireBaseConfig;


function getFireBaseConfig(req, res) {
    res.status(200).send(firebaseConfig);
}