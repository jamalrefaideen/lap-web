'use strict';

var async = require('async');
var express = require('express');
var passport = require('passport');
var mongoose = require('mongoose');
var auth = require('../auth.service');
var _ = require("lodash");
var CONSTANTS = require('../../api/dataconstants/constants');



///////////////// START of fetchPreLoginInfo method //////////////


/**
 *
 * @param req
 * @param res
 * @param next
 * output = {
    'userId':userData._id,
    'schoolId':userData.schoolId,
    'email':userData.email,
    'mobileNumber':userData.mobileNumber,
    'password':'xxxx',
    'isLapAdmin':false,
    'isSchoolAdmin':false,
    'isPrincipal':false,
    'isStaff':false,
    'isParent':false,
    'schoolUserRoleList':[],
    'klassSectionInfoList':[] //{'klassSectionId','klassSectionName', 'subjectNameList', 'isKlassTeacher', 'isStaffTeacher'},
  };
 */
exports.fetchPreLoginInfo = function(req, res, next){

  var authenticator = passport.authenticate('local', function (err, user, info) {

    var error = err || info;
    if (error) return res.json(401, error);
    if (!user) return res.json(404, {message: 'Something went wrong, please try again.'});

    var inputData = req.body;
    auth.fetchLoggedUserMultiRoleInfo(inputData, user.toObject(), function (err, loggedUserMultiRoleInfo) {

      if (err) {
        var errMessage = err.message || 'Something went wrong, please try again.';
        return res.json(404, {message: errMessage});
      }

      return res.json(loggedUserMultiRoleInfo);
    });
  });

  authenticator(req, res, next);
};






///////////////// END of fetchPreLoginInfo method //////////////



///////////////// START of login method //////////////


/*
input: {
  'mobileNumber',
  'password',
  'isLapAdmin',
  'isSchoolAdmin',
  'isPrincipal',
  'isStaff',
  'isParent',
  'klassSectionId',
}*/

exports.login = function(req, res){

  console.log("auth-->local-->index.js-->'/account/login'");

  var inputData = req.body;
  var authenticator = passport.authenticate('local', function (err, user, info) {

    var error = err || info;
    if (error) return res.json(401, error);
    if (!user) return res.json(404, {message: 'Something went wrong, please try again.'});

    var token = generateLoggedUserMultiRoleInfoToken(user.toObject(), inputData);
    return res.json({token: token});
  });

  authenticator(req, res);
};





/*
 input: {
 'mobileNumber',
 'password',
 'isLapAdmin',
 'isSchoolAdmin',
 'isPrincipal',
 'isStaff',
 'isParent',
 'klassSectionId',
 }*/
function generateLoggedUserMultiRoleInfoToken(userData, inputData) {

  var UserRoleTypes = CONSTANTS.UserRoleTypes;
  var userRoleDataMapper = {
    'LAP_ADMIN':{'roleId':UserRoleTypes.LAP_ADMIN.roleId, 'name':'LAP_ADMIN'},
    'SCHOOL_ADMIN':{'roleId':UserRoleTypes.SCHOOL_ADMIN.roleId, 'name':'SCHOOL_ADMIN'},
    'PRINCIPAL':{'roleId':UserRoleTypes.PRINCIPAL.roleId, 'name':'PRINCIPAL'},
    'STAFF':{'roleId':UserRoleTypes.STAFF.roleId, 'name':'STAFF'},
    'PARENT':{'roleId':UserRoleTypes.PARENT.roleId, 'name':'PARENT'}
  };

  var activeUserRoleData = null;
  if(inputData.isLapAdmin==true){
    activeUserRoleData = userRoleDataMapper.LAP_ADMIN;
  }else if(inputData.isSchoolAdmin==true){
    activeUserRoleData = userRoleDataMapper.SCHOOL_ADMIN;
  }else if(inputData.isPrincipal==true){
    activeUserRoleData = userRoleDataMapper.PRINCIPAL;
  }else if(inputData.isStaff==true){
    activeUserRoleData = userRoleDataMapper.STAFF;
  }else if(inputData.isParent==true){
    activeUserRoleData = userRoleDataMapper.PARENT;
  }


  var tokenInputData = {
   'userId': userData._id,
   'activeUserRoleId': activeUserRoleData.roleId,
   'activeUserRoleName': activeUserRoleData.name
   };

  if(inputData.isStaff && inputData.klassSectionId){
    var klassSectionId = mongoose.Types.ObjectId(inputData.klassSectionId);
    tokenInputData['klassSectionId'] = klassSectionId;
  }
   var token = auth.signToken(tokenInputData);
   return token;
}

///////////////// END of login method //////////////
