var ExamTypeModel = require("./examtype.model");
var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;


exports.getExamTypesBySchool =  getExamTypesBySchool;


function getExamTypesBySchool(schoolId, academicYearId){
    var query = {schoolId : schoolId, academicYearId : academicYearId};
    return ExamTypeModel.find(query).lean();
}
