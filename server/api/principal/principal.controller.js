'use strict';
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

var PrincipalLearningTraitService = require('./principal-learningtraits.service');
var AppUtil = require("../common/app.util");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;

exports.getPrincipalLearningTraitsInfo = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var academicYearInfo = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    PrincipalLearningTraitService.getPrincipalLearningTraitsInfo(schoolId, academicYearInfo._id)
        .then(handleSuccess(res))
        .catch(handleError(res));
};

