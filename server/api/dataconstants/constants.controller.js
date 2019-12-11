'use strict';

var express = require('express');
var constants = require('./constants.js');
var _ = require("lodash");

var router = express.Router();

exports.getUserRoleTypes = function(req, res){
  return res.json(200, constants.UserRoleTypes);
};

exports.getDiaryMessageTypes = function(req, res){
  return res.json(200, constants.DiaryMessageTypes);
};

exports.getNotificationTargetTypes = function(req, res){
  return res.json(200, _.clone(constants.NotificationTargetType));
};

exports.getPrincipalNotificationTargetTypes = function(req, res){
  var NotificationTargetType = _.clone(constants.NotificationTargetType);
  delete NotificationTargetType.SELECTED_SECTION_STUDENTS;
  return res.json(200, NotificationTargetType);
};

exports.getEventTargetTypes = function(req, res){
  return res.json(200,  _.clone(constants.EventTargetType));
};

exports.getPrincipalEventTargetTypes = function(req, res){

  var EventTargetType = _.clone(constants.EventTargetType);
  delete EventTargetType.SELECTED_SECTION_STUDENTS;
  return res.json(200, EventTargetType);
};



