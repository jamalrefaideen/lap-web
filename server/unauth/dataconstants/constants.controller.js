'use strict';

var express = require('express');
var constants = require('../../api/dataconstants/constants.js');
var _ = require("lodash");

var router = express.Router();

exports.getUserRoleTypes = function(req, res){
  return res.json(200, constants.UserRoleTypes);
};




